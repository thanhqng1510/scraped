import * as https from 'https';

const PROXY_LIST_URLS: string[] = [
  'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/http/data.txt',
  'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/https/data.txt',
];

let availableProxies: string[] = [];

const fetchProxyList = (url: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data.split('\n').map(line => line.trim()).filter(line => line.length > 0));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

export const loadProxies = async () => {
  try {
    const results = await Promise.allSettled(PROXY_LIST_URLS.map(url => fetchProxyList(url)));
    
    const fetchedProxies: string[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        fetchedProxies.push(...result.value);
      } else {
        console.error(`Failed to fetch proxy list: ${result.reason}`);
      }
    });

    availableProxies = Array.from(new Set(fetchedProxies)); // Remove duplicates
    console.log(`Loaded ${availableProxies.length} unique proxies.`);
  } catch (error) {
    console.error('Error loading proxies:', error);
  }
};

export const getRandomProxy = (): string | undefined => {
  if (availableProxies.length === 0) {
    return undefined; // No proxies available
  }
  return availableProxies[Math.floor(Math.random() * availableProxies.length)];
};
