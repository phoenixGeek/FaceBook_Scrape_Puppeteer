const puppeteer = require('puppeteer');
const C = require('./constants');

const USERNAME_SELECTOR = '#m_login_email';
const PASSWORD_SELECTOR = '#m_login_password';
const M_LOGIN_SELECTOR = 'button[type="button"][value="Log In"]';
const CONTINUE_BTN_SELECTOR = "#checkpointSubmitButton-actual-button";
const CODE_TO_EMAIL_SELECTOR = 'input[name="verification_method"][value="37"]';
const CPTCHA_RES_SELECTOR = 'input[name="captcha_response"]';

const TWOFA_INPUT_SELECTOR = 'input[name="approvals_code"]';
const HAVE_TROUBLE_SELECTOR = "._dd6";
const SEND_LOGIN_CODE_SELECTOR = 'input[name="help_selected"][value="sms_requested"]'

const LOGIN_ONE_TAP_SELECTOR = '._2pis';
const ACCEPT_ALL_SELECTOR = '[data-testid="cookie-policy-dialog-accept-button"]';
const ACCEPT_ALL_MOBILE_SELECTOR = '[data-cookiebanner="accept_button"]';

const swig = require('swig');

let warnmsg = '';
let loginFailedFlag = false;
let warnFlag = false;
let cookies = {};
let browser;
let page;
let email = '';
let password = '';

async function startBrowser() {
    browser = await puppeteer.launch({
        product: 'firefox',
        headless: false,    //  set as false to open a chromium
        ignoreDefaultArgs: ["--enable-automation"],
        defaultViewport: null,
        args: ["--no-sandbox",
            "--disable-setuid-sandbox",
            "--start-maximized"
        ]
    });
    page = await browser.newPage();
    page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36"
    );
}

async function closeBrowser(browser) {
    return browser.close();
}

const delay = (ms) => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    })
}

async function playTest(url, res) {
    try {
        await startBrowser();
        await page.setDefaultNavigationTimeout(800000);
        console.log(new Date().toLocaleString() + ': ', 'connecting login page ...');
        await page.goto(url);

        if (await page.$(ACCEPT_ALL_SELECTOR) !== null) {
            const accept_all_elm = await page.$(ACCEPT_ALL_SELECTOR);
            await accept_all_elm.click({ clickCount: 1 });
        } else {
            console.log('Accept all of webpage not found');
        }

        if (await page.$(ACCEPT_ALL_MOBILE_SELECTOR) !== null) {
            const accept_all_mobile_elm = await page.$(ACCEPT_ALL_MOBILE_SELECTOR);
            await accept_all_mobile_elm.click({ clickCount: 1 });
        } else {
            console.log('Accept all of mobile page not found');
        }

        await delay(2000);
        await playing(res);

    } catch (e) {
        console.error(new Date().toLocaleString() + ': ', e);
        await page.screenshot({ path: 'login_error.png' });
    }
}

async function handleTwofaProcess(twofa_email, twofa_code) {

    console.log("twofa is here");

    await delay(5000);
    // await delay(600000);

    await page.click(TWOFA_INPUT_SELECTOR);
    await page.keyboard.type(twofa_code);
    await delay(3000);
    await page.click(CONTINUE_BTN_SELECTOR);
    await delay(2000);

    console.log("wonderful twofa code");

    if (await page.$(CONTINUE_BTN_SELECTOR) !== null) {
        await page.click(CONTINUE_BTN_SELECTOR);
        await delay(2000);
        console.log("11111111");
        if (await page.$(CONTINUE_BTN_SELECTOR) !== null) {
            await page.click(CONTINUE_BTN_SELECTOR);
            await delay(6000);
            console.log("2222222222");
            if (await page.$(CONTINUE_BTN_SELECTOR) !== null) {
                await page.click(CONTINUE_BTN_SELECTOR);
                await delay(2000);
                console.log("333333333333");
                if (await page.$(CONTINUE_BTN_SELECTOR) !== null) {
                    await page.click(CONTINUE_BTN_SELECTOR);
                    console.log("44444444444444");
                }
            }

        }
    }
    await getCookies();
}

async function handleIpProcess(ip_email, ip_code) {

    await page.waitForSelector(CPTCHA_RES_SELECTOR, {
        visible: true,
    });
    await delay(5000);
    // await delay(600000);

    await page.click(CPTCHA_RES_SELECTOR);
    await page.keyboard.type(ip_code);

    await delay(2000);
    await page.click(CONTINUE_BTN_SELECTOR);

    await delay(5000);
    await page.click(CONTINUE_BTN_SELECTOR);

    await getCookies();
}

async function getCookies() {

    await delay(10000);
    await page.screenshot({ path: 'linkedin.png' });
    var data = await page._client.send('Network.getAllCookies');

    if (data.cookies) {
        for (let i = 0; i < data.cookies.length; i++) {
            let item = data.cookies[i];
            let cookieName = item.name;
            let cookieValue = item.value;
            cookies[cookieName] = cookieValue
        }
    }
}

const playing = async (res) => {

    console.log(new Date().toLocaleString() + ': ', 'waiting for login form ...');

    await page.waitForSelector(USERNAME_SELECTOR, {
        visible: true,
    });

    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(email);
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(password);
    await delay(2000);
    const m_login_elm = await page.$(M_LOGIN_SELECTOR);
    await m_login_elm.click({ clickCount: 1 });

    console.log(new Date().toLocaleString() + ': ', 'logging in ...');

    try {
        await page.waitForNavigation({ timeout: 10000 });

    } catch (error) {
        console.log("horrible");
        loginFailedFlag = true;
        return res.status(400).json({ status: 'failure', info: 'Invalid Login' }).end();
        // throw new Error("url invalid credential" + error);
    }

    console.log("wwwwwww")
    if (await page.$(CONTINUE_BTN_SELECTOR) !== null) {
        console.log("qqqqq")

        loginFailedFlag = false;
        if (await page.$(TWOFA_INPUT_SELECTOR) !== null) {

            await page.click(HAVE_TROUBLE_SELECTOR);
            await page.waitForSelector(SEND_LOGIN_CODE_SELECTOR, {
                visible: true,
            });
            const send_login_code_elm = await page.$(SEND_LOGIN_CODE_SELECTOR);
            await send_login_code_elm.click();

            await delay(2000);
            await page.click(CONTINUE_BTN_SELECTOR);

            warnFlag = true
            warnmsg = '2FA activate, upload code';

        } else {

            warnFlag = false
            await page.waitForSelector(CONTINUE_BTN_SELECTOR, {
                visible: true,
            });
            await page.click(CONTINUE_BTN_SELECTOR);
            await delay(4000);

            await page.waitForSelector(CODE_TO_EMAIL_SELECTOR, {
                visible: true,
            });

            if (await page.$(CODE_TO_EMAIL_SELECTOR) !== null) {

                await delay(3000);

                console.log("ccccccc")
                await page.$eval(CODE_TO_EMAIL_SELECTOR, check => check.checked = true);
                await page.click(CONTINUE_BTN_SELECTOR);

                // const send_login_code_elm = await page.$(CODE_TO_EMAIL_SELECTOR);
                // await send_login_code_elm.click();
                console.log("dddddd")
                await delay(6000);
                await page.click(CONTINUE_BTN_SELECTOR);
                warnFlag = true;
                warnmsg = 'Ip activate, upload code';

            } else {

                if (await page.$(CONTINUE_BTN_SELECTOR) !== null) {
                    console.log("mmmmmmm")
                    await page.click(CONTINUE_BTN_SELECTOR);
                    await delay(4000);
                }

                await page.click(CONTINUE_BTN_SELECTOR);

                await getCookies();


                // await page.waitForSelector(CODE_TO_EMAIL_SELECTOR, {
                //     visible: true,
                // });
                // await page.$eval(CODE_TO_EMAIL_SELECTOR, check => check.checked = true);
                // await page.click(CONTINUE_BTN_SELECTOR);

            }
        }

    } else {

        warnFlag = false
        loginFailedFlag = false;
        console.log('not found verification step');
        if (await page.$(LOGIN_ONE_TAP_SELECTOR) !== null) {

            await page.waitForSelector(LOGIN_ONE_TAP_SELECTOR, {
                visible: true,
            });
            await page.click(LOGIN_ONE_TAP_SELECTOR);
        }
        await getCookies();
    }
}

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 3005
const path = require('path');
const { group } = require('console');
const { SSL_OP_COOKIE_EXCHANGE } = require('constants');
const e = require('express');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// view engine setup
app.engine('swig', swig.renderFile);
app.set('view engine', 'swig');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/public'));

app.get('/', async (req, res) => {

    cookies = {};
    if (req.query && req.query.email && req.query.password) {
        email = req.query.email;
        password = req.query.password;
    } else {
        return res.status(400).json({ status: 'failure', info: 'No Information Set' }).end();
    }

    await playTest("https://m.facebook.com/login/", res);

    if (!loginFailedFlag) {

        if (warnFlag) {
            return res.status(200).json({ status: 'success', info: warnmsg }).end();
        } else {

            return res.status(200).json({ status: 'success', info: cookies }).end();
        }
    }
});

app.get('/ip', async (req, res) => {

    if (req.query && req.query.email && req.query.code) {

        let ip_email = req.query.email;
        let ip_code = req.query.code;
        await handleIpProcess(ip_email, ip_code);
        return res.status(200).json({ status: 'success', info: cookies }).end();

    } else {
        return res.status(400).json({ status: 'failure', info: 'Awaiting Email Code' }).end();
    }
});

app.get('/twofa', async (req, res) => {

    if (req.query && req.query.email && req.query.code) {

        let twofa_email = req.query.email;
        let twofa_code = req.query.code;
        await handleTwofaProcess(twofa_email, twofa_code);
        return res.status(200).json({ status: 'success', info: cookies }).end();

    } else {

        return res.status(400).json({ status: 'failure', info: 'Awaiting 2FA Code' }).end();
    }
});

app.listen(port, () => {
    console.log(new Date().toLocaleString() + ': ', `Example app listening at http://localhost:${port}`)
})