'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../docs'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),head=html.slice(0,html.indexOf('</head>')),domain=fs.readFileSync(path.join(root,'CNAME'),'utf8').trim(),base='https://'+domain+'/';
const reports=[];function check(n,v){if(!v)throw Error(n);reports.push(n);}
const canonical=[...head.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)].map(m=>m[1]);
const meta=(name,attribute='name')=>{const escaped=name.replace(/[.*+?^$()|[\]\\]/g,'\\$&');return head.match(new RegExp('<meta\\b[^>]*'+attribute+'="'+escaped+'"[^>]*content="([^"]*)"'))?.[1];};
check('one canonical uses custom domain root',canonical.length===1&&canonical[0]===base);
check('title is descriptive and branded',/<title>JEBG AI Technologies \| Industrial AI &amp; Business Automation<\/title>/.test(head));
check('description is present',typeof meta('description')==='string'&&meta('description').length>50);
check('Open Graph URL agrees with canonical',meta('og:url','property')===base);
check('Open Graph name and type match website',meta('og:site_name','property')==='JEBG AI Technologies'&&meta('og:type','property')==='website');
check('social description matches search description',meta('og:description','property')===meta('description')&&meta('twitter:description')===meta('description'));
check('homepage is not marked noindex',!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(head));
check('one primary page heading',(html.match(/<h1\b/g)||[]).length===1);
const jsonBlocks=[...head.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
check('one structured-data graph',jsonBlocks.length===1);
const data=JSON.parse(jsonBlocks[0][1]),graph=data['@graph'],org=graph.find(x=>x['@type']==='Organization'),site=graph.find(x=>x['@type']==='WebSite');
check('schema.org context',data['@context']==='https://schema.org');
check('organization and website are present',!!org&&!!site&&graph.length===2);
check('organization name appears in public page',html.includes(org.name));
check('organization email matches visible contact',html.includes('mailto:'+org.email));
check('organization phone matches visible contact',html.includes('tel:'+org.telephone));
check('organization and website URLs agree',org.url===base&&site.url===base);
check('website publisher references organization',site.publisher['@id']===org['@id']);
check('website has correct public name and language',site.name==='JEBG AI Technologies'&&site.inLanguage==='en');
check('no invented rating, address or country/client claims',!org.aggregateRating&&!org.review&&!org.address&&!org.areaServed&&!org.award&&!org.founder);
check('logo is local and suitable dimensions',org.logo.url.startsWith(base)&&org.logo.width>=112&&org.logo.height>=112);
const logoPath=new URL(org.logo.url).pathname.slice(1),logo=fs.readFileSync(path.join(root,logoPath),'utf8');
check('logo SVG contains brand text',logo.includes('<svg')&&logo.includes('JEBG'));
check('logo SVG has no executable or remote content',!/<script|<foreignObject|\son\w+\s*=|(?:href|src)=["'](?:https?:|javascript:|data:)/i.test(logo));
check('favicon refers to the existing local logo',head.includes('rel="icon" href="./'+logoPath+'"'));
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),locations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
check('sitemap has XML declaration and standard namespace',sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')&&sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
check('sitemap includes canonical homepage only',locations.length===1&&locations[0]===base);
check('sitemap excludes fragments, admin, backend and third-party URLs',locations.every(url=>url.startsWith(base)&&!new URL(url).hash&&!/admin|backend|script\.google/.test(url)));
const compact=sitemap.replace(/>\s+</g,'><').trim();
check('single-page XML structure is well-formed',compact==='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+base+'</loc></url></urlset>');
const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
check('crawler file allows public discovery',/^User-agent: \*$/m.test(robots)&&/^Allow: \/$/m.test(robots)&&!/^Disallow: \/\s*$/m.test(robots));
check('crawler sitemap directive agrees with canonical',robots.includes('Sitemap: '+base+'sitemap.xml'));
const admin=fs.readFileSync(path.join(root,'admin/index.html'),'utf8');
check('admin launcher remains noindex',/<meta name="robots" content="noindex,nofollow">/.test(admin));
check('crawler file does not block reading admin noindex',!/^Disallow: \/admin/m.test(robots));
let executable=0;
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(/\btype=["']application\/ld\+json["']/i.test(match[1]))JSON.parse(match[2]);
 else if(/\bsrc=/.test(match[1])){
  const src=match[1].match(/\bsrc=["']([^"']+)["']/)?.[1];
  check('external script uses a local path',!!src&&/^\.\/js\/[A-Za-z0-9._-]+\.js$/.test(src));
  new Function(fs.readFileSync(path.join(root,src),'utf8'));
 }else{new Function(match[2]);executable++;}
}
check('structured data is not executable JavaScript',executable===1);
console.log(reports.length+' SEO checks passed.');
