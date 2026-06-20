async function testRSS() {
  try {
    const urls = [
      "https://feeds.bbci.co.uk/sport/football/rss.xml",
      "https://www.espn.com/espn/rss/soccer"
    ];
    
    for (const url of urls) {
      console.log(`Fetching ${url}...`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const text = await res.text();
      console.log(`${url} fetched length:`, text.length);
      
      if (text.length > 0) {
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        const items = [];
        
        while ((match = itemRegex.exec(text)) !== null) {
          const itemContent = match[1];
          const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemContent.match(/<title>([\s\S]*?)<\/title>/);
          const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemContent.match(/<description>([\s\S]*?)<\/description>/);
          const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
          const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
          
          items.push({
            title: titleMatch ? titleMatch[1].trim() : "",
            description: descMatch ? descMatch[1].trim() : "",
            link: linkMatch ? linkMatch[1].trim() : "",
            pubDate: pubDateMatch ? pubDateMatch[1].trim() : ""
          });
        }
        
        console.log("Parsed items count:", items.length);
        if (items.length > 0) {
          console.log("First item:", JSON.stringify(items[0], null, 2));
          break;
        }
      }
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

testRSS();
