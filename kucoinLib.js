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

    this.serverTime = () => {

    }

    const request = async (params, options = {}, type = 'default') => {



        try {
            let response = await axios();
        } catch (err) {

        }
    }

    // 

    const fetchOffset = async (tries = 0) => {
        let startTime = Date.now();
        let time = await this.serverTime(true, 3);
        if (time.error) return;
        let currentTime = Date.now();
        let delta = (currentTime - startTime) / 2;
        this.timestamp_offset = time + parseInt(delta) - currentTime + this.timestampOffset_offset;
        if (this.query) {
            console.log({ deltaTime: (delta * 2).toFixed() }, { timestamp_offset: this.timestamp_offset })
        }
        if (tries < 3) fetchOffset(++tries); else this.callback();
    }

    if (options.useServerTime && options.useServerTime == true) { setInterval(fetchOffset, 1 * 60 * 60 * 1000); fetchOffset() }
}

module.exports = api;