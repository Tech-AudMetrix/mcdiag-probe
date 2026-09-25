const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const FAKE = "https://mundodecartaodecredito.com/en/dante-dating-app-como-funciona/";
const IUNIT = "gpt_unit_/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814_0";

const TARGETING = {
  id_post_wp: "934",
  campanha: "934",
  utm_campaign_medium: "_",
  utm_campaign_term: "_",
  utm_source_land_uri: "_/en/dante-dating-app-como-funciona/",
  experiment: "control",
  utm_source: "null",
  utm_medium: "null",
  utm_campaign: "null",
  utm_content: "null",
  utm_term: "null",
  request_uri: "/en/dante-dating-app-como-funciona/",
  land_uri: "/en/dante-dating-app-como-funciona/",
  bids: "null",
  price_rules: "null",
  price_rule_analytics: "null",
  article: "934"
};

function controlHtml(withTargeting) {
  var s = "";
  s += "<!DOCTYPE html><html><head><meta charset=\"utf-8\">";
  s += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  s += "<scr" + "ipt async src=\"https://securepubads.g.doubleclick.net/tag/js/gpt.js\"></scr" + "ipt>";
  s += "<style>body{margin:0;font-family:sans-serif}#content{padding:20px}</style></head><body>";
  s += "<div id=\"content\"><h1>CONTROL " + (withTargeting ? "WITH TARGETING" : "NO TARGETING") + "</h1></div>";
  s += "<scr" + "ipt>";
  s += "window.googletag = window.googletag || {cmd: []};";
  s += "googletag.cmd.push(function(){";
  s += "var b = googletag.defineOutOfPageSlot(\"/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814\", googletag.enums.OutOfPageFormat.INTERSTITIAL);";
  s += "if (b) { b.addService(googletag.pubads()); }";
  if (withTargeting) {
    s += "var T = " + JSON.stringify(TARGETING) + ";";
    s += "Object.keys(T).forEach(function(k){ googletag.pubads().setTargeting(k, String(T[k])); });";
  }
  s += "googletag.enableServices();";
  s += "if (b) { googletag.display(b); }";
  s += "});";
  s += "</scr" + "ipt></body></html>";
  return s;
}

async function runScenario(browser, label, withTargeting) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "pt-BR" });
  await ctx.addInitScript(function () {
    window.__gtlog = [];
    var iv = setInterval(function () {
      var g = window.googletag;
      if (g && typeof g.display === "function" && !g.__patched) {
        g.__patched = true;
        var oe = g.enableServices;
        if (oe) { g.enableServices = function () { window.__gtlog.push("enableServices"); return oe.apply(this, arguments); }; }
        try {
          g.pubads().addEventListener("slotRenderEnded", function (e) {
            var id = "?";
            try { id = e.slot.getSlotElementId(); } catch (x) {}
            window.__gtlog.push("slotRenderEnded:" + id + ":isEmpty=" + e.isEmpty + ":size=" + (e.size ? e.size.join("x") : "null"));
          });
        } catch (e) { window.__gtlog.push("listenerErr:" + e.message); }
      }
    }, 20);
    setTimeout(function () { clearInterval(iv); }, 25000);
  });
  const page = await ctx.newPage();
  const ev = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });
  await page.route("**/en/dante-dating-app-como-funciona/**", function (route) {
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: controlHtml(withTargeting) });
  });
  try { await page.goto(FAKE, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { ev.push("[gotoerr] " + e.message); }
  await page.waitForTimeout(16000);
  const st = await page.evaluate(function (id) {
    var o = {};
    o.readyState = document.readyState;
    var u = document.getElementById(id);
    o.unitFound = !!u;
    if (u) {
      var cs = window.getComputedStyle(u);
      var r = u.getBoundingClientRect();
      o.display = cs.display;
      o.z = cs.zIndex;
      o.rect = { w: Math.round(r.width), h: Math.round(r.height) };
    }
    o.gtlog = window.__gtlog || null;
    return o;
  }, IUNIT);
  try { await page.screenshot({ path: OUT + "/probe4_" + label + ".png" }); } catch (e) {}
  fs.writeFileSync(OUT + "/probe4_" + label + ".json", JSON.stringify(st, null, 2));
  fs.writeFileSync(OUT + "/probe4_" + label + "_events.txt", ev.join("\n"));
  await ctx.close();
}

(async function () {
  const browser = await pw.chromium.launch({
    headless: process.env.PW_HEADED ? false : true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"]
  });
  await runScenario(browser, "notarget", false);
  await runScenario(browser, "targeting", true);
  await browser.close();
  console.log("PROBE4 DONE");
})().catch(function (e) { console.log("PROBE4 FAILED: " + e.message); process.exit(1); });
