export function get(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            onload: (response) => {
                if (response.status < 200 || response.status >= 300) {
                    reject(new Error(`${response.status} ${response.statusText}`));

                    return;
                }

                resolve(JSON.parse(response.responseText));
            },
            onerror: () => reject(new Error('request failed')),
            ontimeout: () => reject(new Error('request timed out')),
        });
    });
}
