// Buffer polyfill for browser environments
if (typeof Buffer === 'undefined') {
	globalThis.Buffer = {
		from: function(data) {
			if (data instanceof Uint8Array) {
				// Convert Uint8Array to base64
				let binary = '';
				for (let i = 0; i < data.length; i++) {
					binary += String.fromCharCode(data[i]);
				}
				return {
					toString: function(encoding) {
						if (encoding === 'base64') {
							return btoa(binary);
						}
						return binary;
					}
				};
			}
			// For other types, create a simple wrapper
			return {
				toString: function(encoding) {
					if (encoding === 'base64') {
						return btoa(String(data));
					}
					return String(data);
				}
			};
		}
	};
}