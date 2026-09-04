export function post(url, payload) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url,
            headers: {'content-type': 'application/json'},
            data: JSON.stringify(payload),
            onload: (response) => {
                if (response.status >= 200 && response.status < 300) {
                    resolve(response);

                    return;
                }

                reject(new Error(`${response.status} ${response.statusText}`));
            },
            onerror: () => reject(new Error('request failed')),
            ontimeout: () => reject(new Error('request timed out')),
        });
    });
}
