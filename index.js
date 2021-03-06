const puppeteer = require('puppeteer');
const C = require('./constants');
const USERNAME_SELECTOR = '#email';
const PASSWORD_SELECTOR = '#pass';
const CTA_SELECTOR = '#loginbutton';
// const ACCEPT_ALL_SELECTOR = '._9o-t';
const ACCEPT_ALL_SELECTOR = '[data-testid="cookie-policy-dialog-accept-button"]';

const swig = require('swig');
let cookieString = '';
let cookies = [];
let browser;
let page;
let email = '';
let password = '';

async function startBrowser() {
    browser = await puppeteer.launch({
        product: 'firefox',
        headless: false,    //  set as false to open a chromium
        ignoreDefaultArgs: ["--enable-automation"],
        args: ['--proxy-server=zproxy.lum-superproxy.io:22225']
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

async function playTest(url) {
    try {
        await startBrowser();
        page.setViewport({ width: 1366, height: 768 });
        await page.setDefaultNavigationTimeout(60000);
        console.log(new Date().toLocaleString() + ': ', 'connecting login page ...');
        await page.goto(url);

        if (await page.$(ACCEPT_ALL_SELECTOR) !== null) {
            const accept_all_elm = await page.$(ACCEPT_ALL_SELECTOR);
            await accept_all_elm.click({ clickCount: 1 });
            // await page.click(accept_all_elm);
        } else {
            console.log('not found');
        }

        await delay(2000);
        await playing();

    } catch (e) {
        console.error(new Date().toLocaleString() + ': ', e);
        await page.screenshot({ path: 'login_error.png' });
    }
}

const playing = async () => {

    console.log(new Date().toLocaleString() + ': ', 'waiting for login form ...');

    await page.waitForSelector(USERNAME_SELECTOR, {
        visible: true,
    });

    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(email);
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(password);
    await page.click(CTA_SELECTOR);
    console.log(new Date().toLocaleString() + ': ', 'logging in ...');
    await page.waitForNavigation();
    await page.screenshot({ path: 'linkedin.png' });
    var data = await page._client.send('Network.getAllCookies');
    // console.log(new Date().toLocaleString() + ': ', data);
    cookies = data.cookies;
    cookieString = `<main>
                        <table class="table table-bordered">
                            <tr>
                                <td>Cookie Key</td>
                                <td>Cookie Value</td>
                                <td>Cookie Expires</td>
                                <td>Domain</td>
                                <td>HttpOnly</td>
                            </tr>`;

    if (data.cookies) {
        for (let i = 0; i < data.cookies.length; i++) {
            let item = data.cookies[i];
            cookieString += `<tr>
                                <td>${item.name}</td>
                                <td>${item.value}</td>
                                <td>${item.expires}</td>
                                <td>${item.domain}</td>
                                <td>${item.httpOnly}</td>
                            </tr>`;
        }
        cookieString += `</table>
                        </main>`;
    }
}

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 3005
const path = require('path');
const { group } = require('console');
const { SSL_OP_COOKIE_EXCHANGE } = require('constants');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// view engine setup
app.engine('swig', swig.renderFile);
app.set('view engine', 'swig');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/public'));

app.get('/', async (req, res) => {

    return res.render('index', { content: cookieString });
});

app.post('/cookie', async (req, res) => {

    email = req.body.email;
    password = req.body.password;
    await playTest("https://en-gb.facebook.com/login/");
    res.status(200).json({ content: cookieString }).end();
    // res.render('index', { content: cookieString });
});

app.listen(port, () => {
    console.log(new Date().toLocaleString() + ': ', `Example app listening at http://localhost:${port}`)
})