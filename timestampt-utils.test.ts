import {formatTimestamp} from "./timestampt-utils";

describe('formatTimestamp', () => {
	it('should format the timestamp correctly when hours are present', () => {
		const timestamp = 3661000;
		const formatted = formatTimestamp(timestamp);
		expect(formatted).toEqual('01:01:01');
	});

	it('should format the timestamp correctly when hours are absent', () => {
		const timestamp = 61000;
		const formatted = formatTimestamp(timestamp);
		expect(formatted).toEqual('01:01');
	});

	it('should format the timestamp correctly when minutes and seconds are zero', () => {
		const timestamp = 3600000;
		const formatted = formatTimestamp(timestamp);
		expect(formatted).toEqual('01:00:00');
	});

	it('should format the timestamp correctly when all components are zero', () => {
		const timestamp = 0;
		const formatted = formatTimestamp(timestamp);
		expect(formatted).toEqual('00:00');
	});

	it('should format the timestamp correctly when the input is negative', () => {
		const timestamp = -5000;
		const formatted = formatTimestamp(timestamp);
		expect(formatted).toEqual('00:00');
	});
});
