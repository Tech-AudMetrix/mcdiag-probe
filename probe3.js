const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const REAL = "https://mundodecartaodecredito.com/en/dante-dating-app-como-funciona/";
const IUNIT = "gpt_unit_/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814_0";

function controlHtml() {
  var s = "";
  s += "<!DOCTYPE html><html><head><meta charset=\"utf-8\">";
  s += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  s += "<scr" + "ipt async src=\"https://securepubads.g.doubleclick.net/tag/js/gpt.js\"></scr" + "ipt>";
  s += "<style>body{margin:0;font-family:sans-serif}#content{padding:20px}</style></head><body>";
  s += "<div id=\"content\"><h1>CONTROL</h1><p>minimal page for interstitial test</p></div>";
  s += "<scr" + "ipt>";
  s += "window.googletag = window.googletag || {cmd: []};";
  s += "googletag.cmd.push(function(){";
  s += "var b = googletag.defineOutOfPageSlot(\"/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814\", googletag.enums.OutOfPageFormat.INTERSTITIAL);";
  s += "if (b) { b.addService(googletag.pubads()); googletag.enableServices(); googletag.display(b); }";
  s += "});";
  s += "</scr" + "ipt></body></html>";
  return s;
}

async function snap(page, unitId) {
  const st = await page.evaluate(function (id) {
    var o = {};
    o.url = location.href;
    o.readyState = document.readyState;
    o.visibility = document.visibilityState;
    var u = document.getElementById(id);
    o.unitFound = !!u;
    if (u) {
      var cs = window.getComputedStyle(u);
      var r = u.getBoundingClientRect();
      o.display = cs.display;
      o.position = cs.position;
      o.z = cs.zIndex;
      o.rect = { w: Math.round(r.width), h: Math.round(r.height) };
      o.style = (u.getAttribute("style") || "").slice(0, 300);
    }
    return o;
  }, unitId);
  return st;
}

(async function () {
  const browser = await pw.chromium.launch({
    headless: process.env.PW_HEADED ? false : true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"]
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "pt-BR" });
  const page = await ctx.newPage();
  const ev = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });

  await page.route("**/en/dante-dating-app-como-funciona/**", function (route) {
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: controlHtml() });
  });
  try { await page.goto(REAL, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { ev.push("[gotoerrA] " + e.message); }
  await page.waitForTimeout(15000);
  const a = await snap(page, IUNIT);
  try { await page.screenshot({ path: OUT + "/probe3_A_control.png" }); } catch (e) {}

  await page.unroute("**/en/dante-dating-app-como-funciona/**");
  try { await page.goto(REAL + "?nocache=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { ev.push("[gotoerrB] " + e.message); }
  await page.waitForTimeout(22000);
  const b = await snap(page, IUNIT);
  try { await page.screenshot({ path: OUT + "/probe3_B_real.png" }); } catch (e) {}

  fs.writeFileSync(OUT + "/probe3_state.json", JSON.stringify({ control: a, real: b }, null, 2));
  fs.writeFileSync(OUT + "/probe3_events.txt", ev.join("\n"));
  await ctx.close();
  await browser.close();
  console.log("PROBE3 DONE");
})().catch(function (e) { console.log("PROBE3 FAILED: " + e.message); process.exit(1); });
