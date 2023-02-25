let api = function everything(APIKEY = false, APISecret = false, PassPhrase = false, options = { fetchFloats: false, useServerTime: false, recvWindow: 10000 }) {
    if (!new.target) return new api(APIKEY, APISecret, options); // Legacy support for calling the constructor without 'new';
    const axios = require('axios');
    const crypto = require('crypto');
    const ws = require('ws');
    const bigInt = require('json-bigint')({ storeAsString: true });
    const Kucoin = this;

    axios.defaults.headers.common['Content-Type'] = 'application/json';

    const
        api = 'https://api.kucoin.com';
    ;

    // const
    //     WS = 'wss://ws-api.binance.com:443/ws-api/v3',
    //     sWSS = 'wss://stream.binance.com:443',
    //     fWSS = 'wss://fstream.binance.com';
    // ;

    this.APIKEY = APIKEY;
    this.APISECRET = APISecret;
    this.PassPhrase = PassPhrase;
    this.apiVersion = options.apiVersion ? options.apiVersion : '2';
    this.timestamp_offset = 0;
    this.latency = 0;

    if (options.timeout) this.timeout = options.timeout; else this.timeout = 500;
    if (options.hedgeMode == true) this.hedgeMode = true; else this.hedgeMode = false;
    if (options.fetchFloats == true) this.fetchFloats = true; else this.fetchFloats = false;
    if (options.recvWindow) this.recvWindow = options.recvWindow; else this.recvWindow = 8000;
    if (options.query) this.query = true; else this.query = false;
    if (options.ws) this.ws = options.ws; else this.ws = false;

    const SECOND = 1000,
        MINUTE = 60 * SECOND,
        HOUR = 60 * MINUTE,
        DAY = 24 * HOUR;
    ;



    // public   \\\\

    this.serverTime = () => {
        const params = {
            baseURL: api,
            method: 'get',
            path: '/api/v1/timestamp'
        }
        return request(params);
    }

    this.serverStatus = () => {
        const params = {
            baseURL: api,
            method: 'get',
            path: '/api/v1/status'
        }
        return request(params);
    }

    this.exchangeInfo = async (mapped = false) => {
        const params = {
            baseURL: api,
            method: 'get',
            path: '/api/v1/symbols'
        }

        let data = await request(params);

        for (let symbol of data) {
            symbol.symbolName = symbol.symbol.split('-').join('');
            symbol.quantityPrecision = symbol.baseIncrement.split('.')[1].length;
            symbol.pricePrecision = symbol.priceIncrement.split('.')[1].length;
        }

        if (mapped) {
            const tempData = {};
            tempData.symbols = [];
            data.forEach((symbol_object) => {
                tempData[symbol_object.symbol] = symbol_object;
                tempData.symbols.push(symbol_object.symbol);
            })
            data = tempData;
        }

        if (this.fetchFloats) return parseAllPropertiesToFloat(data); else return data;
    }

    this.ticker = (symbol = undefined) => {
        const params = {
            baseURL: api,
            path: symbol ? '/api/v1/market/orderbook/level1' : '/api/v1/market/allTickers',
            method: 'get'
        }
        const options = {
            symbol
        }

        return request(params, options);
    }

    this.lastPrice = async (symbol = undefined) => {
        const params = {
            baseURL: api,
            path: symbol ? '/api/v1/market/orderbook/level1' : '/api/v1/market/allTickers',
            method: 'get'
        }
        const options = {
            symbol
        }

        const response = await request(params, options);
        if (response.error) return response;

        
    }

    // public   ////

    this.accountBalance = async (currency = undefined, type = undefined, activeAssetsOnly = false, mappedBalance = false) => {
        const params = {
            method: 'get',
            baseURL: api,
            path: '/api/v1/accounts'
        }

        const options = {
            currency,
            type
        }

        let response = await request(params, options);
        if (response.error) return response;

        if (activeAssetsOnly) {
            response = response.filter(balanceObject => balanceObject.balance != 0);
        }

        if (mappedBalance) {
            const tempData = {};
            tempData.symbols = [];
            for (let balanceObject of response) {
                tempData.symbols.push(balanceObject.currency);
                tempData[balanceObject.currency] = balanceObject;
            }
            response = tempData;
        }

        return response;
    }





    const request = async (params, options = {}, type = 'default') => {
        for (let key of Object.keys(options)) if (options[key] == undefined) delete options[key];
        if (Object.keys(options).length == 0) options = '';

        params.headers = {
            ...axios.defaults.headers.common,
            ...axios.defaults.headers[params.method],
            "KC-API-KEY": Kucoin.APIKEY,
            "KC-API-PASSPHRASE": crypto.createHmac('sha256', this.APISECRET).update(Kucoin.PassPhrase).digest('base64'),
            "KC-API-KEY-VERSION": this.apiVersion
        }

        // if signed

        const timestamp = Date.now() + Kucoin.timestamp_offset;
        const string_to_encode = `${timestamp}${params.method.toUpperCase()}${params.path}${JSON.stringify(options)}`;
        const signature = crypto.createHmac('sha256', this.APISECRET).update(string_to_encode).digest('base64');
        params.headers["KC-API-TIMESTAMP"] = timestamp;
        params.headers["KC-API-SIGN"] = signature;
        // if signed
        if (this.query) console.log(string_to_encode)
        try {
            let startTime = Date.now(), latency;
            let response = await axios({
                method: params.method,
                url: params.baseURL + params.path,
                params: (params.method == 'get' || params.method == 'delete') ? options : '',
                headers: params.headers,
                data: (params.method == 'get' || params.method == 'delete') ? '' : options
            });
            latency = Date.now() - startTime;
            let data = fetchHeadersInfo(response);
            data.latency_millis = latency;

            this.APIKEYSInfo = { ...this.APIKEYSInfo, ...data };

            if (response.data.code == 200000) delete response.data.code;
            else console.log({ errorLocation: 'in function request()', rawData: response.data });

            if (this.fetchFloats && params.path != '/api/v1/symbols') return parseAllPropertiesToFloat(response.data.data); else return response.data.data;
        } catch (err) {
            let error, latency;
            if (err.response && err.response.data) {
                let data = fetchHeadersInfo(err.response);
                data.latency_millis = latency;
                this.APIKEYSInfo = { ...this.APIKEYSInfo, ...data };
                error = {
                    status: err.response.status,
                    statusText: err.response.statusText
                };
                if (typeof err.response.data == 'object') Object.assign(error, err.response.data);
                else Object.assign(error, { code: -1, msg: 'Endpoint not found' });
                if (!err.code) err.code = -2;
                if (!err.msg) err.msg = 'Unknown error, possibly connection error.'
            } else error = {
                status: 408,
                statusText: 'Request Timeout'
            };
            if (!err.code || err.code == 'ENOTFOUND') error.code = -2;
            if (!err.msg) error.msg = 'No connection'
            return { error: error };
        }

        function fetchHeadersInfo(response) {
            const data = {};

            return data;
        }
    }

    // 

    const makeQueryString = (q) => {
        return Object.keys(q)
            .reduce((a, k) => {
                if (Array.isArray(q[k])) {
                    q[k].forEach(v => {
                        a.push(k + "=" + encodeURIComponent(v))
                    })
                } else if (q[k] !== undefined) {
                    a.push(k + "=" + encodeURIComponent(q[k]));
                }
                return a;
            }, [])
            .join("&");
    }

    const fetchOffset = async (tries = 0) => {
        let startTime = Date.now();
        let time = await this.futuresServerTime(true, 3);
        if (time.error) return;
        let currentTime = Date.now();
        let delta = (currentTime - startTime) / 2;
        this.timestamp_offset = time + parseInt(delta) - currentTime + this.timestampOffset_offset;
        if (this.query) {
            console.log({ deltaTime: (delta * 2).toFixed() }, { timestamp_offset: this.timestamp_offset })
        }
        if (tries < 3) fetchOffset(++tries); else this.callback();
    }

    const handleArrayResponse = (Arr, keys, type = 'number') => {
        return Arr.map(item => {
            let ret = {};
            keys.forEach((key, c) => {
                if (key == 'ignore') return;
                if (type == 'number') ret[key] = getNumberOrString(item[c]);
                else ret[key] = item[c];
            });
            return ret;
        })
    }

    const renameObjectProperties = (obj, keys) => {
        if (Array.isArray(obj)) {
            for (let ind in obj) {
                obj[ind] = renameObjectProperties(obj[ind], keys);
            }
        } else {
            let oldKeys = Object.keys(obj);
            let newObj = {};

            for (let x = 0; x < keys.length; x++) {
                let newKey = keys[x];
                let oldKey = oldKeys[x];
                if (newKey == 'ignore') continue;

                if (Array.isArray(newKey)) {
                    let newArr = [...newKey]
                    let newObjKey = newArr.shift();
                    newObj[newObjKey] = renameObjectProperties(obj[oldKey], newArr);
                } else newObj[newKey] = obj[oldKey];
            }
            obj = newObj;
        }
        return obj;
    }

    /**
     * Renames your object keys, it accepts objects, and arrays of objects
     * @param {Object} obj - This is the object that you want to change (You will lose your original object when you use this function)
     * @param {Array} keys - These are your keys that you will send, and since this is the 'advanced' rename, it will follow these rules:
     * - "oldKey=newKey" - This basically means that any element in the array that is a string, will be split into oldKey and newKey, where it will replace the 'oldKey' propertyName, by the 'newKey' propertyName
     * - ["oldKey=newKey", "oldKey=newKey",...] - This is when you have a subObject in your original object, which needs to have its properties renamed:
     * This array will contain: at index 0, it will contain the 'oldKey' of the original Object's property, that will be renamed to 'newKey'
     *  And then the rest (index 1 and above) will be the oldKeys and newKeys of that subObject's properties, and those properties can be arrays themselves too, the function handles recursion
     */
    const advancedRenameObjectProperties = (obj, keys) => {
        if (Array.isArray(obj)) {
            for (let ind in obj) {
                obj[ind] = advancedRenameObjectProperties(obj[ind], keys);
            }
        } else {
            for (let key of keys) {
                if (Array.isArray(key)) {
                    let newArr = [...key];  // this is because 'key' is a reference to an array that will be used by any other subsequent message from the websocket, so if it is changed here (via .shift()), it will lose its value, and only the first websocket message will have its full info, any other will not
                    const [oldKey, newKey] = newArr.shift().split('=');
                    obj[newKey] = advancedRenameObjectProperties(obj[oldKey], newArr);
                    delete obj[oldKey];
                } else {
                    const [oldKey, newKey] = key.split('=');
                    if (newKey != 'ignore') obj[newKey] = obj[oldKey];
                    delete obj[oldKey];
                }
            }
        }
        return obj;
    }

    const parseAllPropertiesToFloat = (obj) => {
        if (obj == null) return obj;
        if (Array.isArray(obj)) for (let index in obj) obj[index] = parseAllPropertiesToFloat(obj[index], index)
        else if (typeof obj == 'object') for (let key of Object.keys(obj)) obj[key] = parseAllPropertiesToFloat(obj[key], key);
        else obj = getNumberOrString(obj);
        return obj;
    }

    const getNumberOrString = (item) => {
        let i = parseFloat(item);
        if (i == i) {
            try {
                return bigInt.parse(item);
            } catch (err) {
                return item;
            }
        } else return item;
    }

    const number = (num) => {
        return parseFloat(num) == parseFloat(num);
    }

    const equal = (variable, possibilities) => {
        return possibilities.filter(a => variable == a).length != 0;
    }

    const randomNumber = (lower, higher) => {
        return parseInt(Math.random() * (higher - lower) + lower);
    }

    const fixValue = (variable, end_value, possibilities) => {
        if (variable == undefined) return variable;
        possibilities.push(end_value.toLowerCase());

        let lower = variable.toLowerCase();
        if (possibilities.filter(a => lower == a.toLowerCase()).length != 0) {
            return end_value;
        }

        return variable;
    }

    const ERR = (msg, errType = false, requiredType = false, possibilities = [], extraMsg = false) => {
        if (errType) {
            if (errType.toLowerCase() == 'required') msg = `Parameter '${msg}' is required for this request.`;
            if (errType.toLowerCase() == 'type') msg = `Parameter '${msg}' should be of type '${requiredType}'.`;
            if (errType.toLowerCase() == 'value') msg = `Parameter '${msg}' is invalid.`
            if (possibilities.length != 0) msg += ` Possible options:${possibilities.map(a => ` '${a}'`)}.`
            if (extraMsg) msg += ` ${extraMsg}`
        }

        return {
            error: {
                status: 400,
                statusText: 'Local Error',
                code: -1,
                msg: msg
            }
        }
    }

    const ERROR = (msg, errType = false, requiredType = false, possibilities = []) => {
        if (errType) {
            if (errType.toLowerCase() == 'required') msg = `${msg == 'callback' ? 'A callback function' : `Parameter '${msg}'`} is required for this request.`;

            if (errType.toLowerCase() == 'type') msg = `Parameter '${msg}' should be of type '${requiredType}'.`;
            if (errType.toLowerCase() == 'value') msg = `Parameter '${msg}' is invalid.`
            if (possibilities.length != 0) msg += ` Possible options:${possibilities.map(a => ` '${a}'`)}.`
        }

        return {
            error: {
                status: 400,
                statusText: 'Websocket Error',
                code: -3,
                msg: msg
            }
        };
    }

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    if (options.useServerTime && options.useServerTime == true) { setInterval(fetchOffset, 1 * 60 * 60 * 1000); fetchOffset() }
}

module.exports = api;