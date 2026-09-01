# CyberFair 2019 Offline Archive Validation

- Files in primary archive: **117**
- HTML pages: **9**
- Local references resolved: **313**
- Missing local references: **10**
- Unique external URLs: **7**

## HTML pages
- `green.htm`
- `index.htm`
- `long.htm`
- `math.htm`
- `narrative.htm`
- `rain.htm`
- `references.htm`
- `working.htm`
- `yellow.htm`

## Missing local references
- `index.htm` → `../../../../favicon.ico` (html:link@href)
- `css/ionicons.min.css` → `../fonts/ionicons.eot?v=4.5.5` (css:url)
- `css/ionicons.min.css` → `../fonts/ionicons.eot?v=4.5.5#iefix` (css:url)
- `css/ionicons.min.css` → `../fonts/ionicons.woff2?v=4.5.5` (css:url)
- `css/ionicons.min.css` → `../fonts/ionicons.woff?v=4.5.5` (css:url)
- `css/ionicons.min.css` → `../fonts/ionicons.ttf?v=4.5.5` (css:url)
- `css/ionicons.min.css` → `../fonts/ionicons.svg?v=4.5.5#Ionicons` (css:url)
- `js/bootstrap.min.js` → `popper.js` (js:quoted-static-ref)
- `js/plyr.js` → `default.jpg` (js:quoted-static-ref)
- `js/vendor/holder.min.js` → `holder.js` (js:quoted-static-ref)

## External URLs
- `http://www.globalschoolnet.org/gsncf/` ← `green.htm`
- `https://cdn.plyr.io/3.4.8/plyr.svg` ← `js/plyr.js`
- `https://cdn.plyr.io/static/blank.mp4` ← `js/plyr.js`
- `https://player.vimeo.com/api/player.js` ← `js/plyr.js`
- `https://imasdk.googleapis.com/js/sdkloader/ima3.js` ← `js/plyr.js`
- `https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.mp4` ← `js/plyr.js`
- `https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.jpg` ← `js/plyr.js`
