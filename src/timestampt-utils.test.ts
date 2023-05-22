import { formatTimestamp } from "./timestampt-utils";

describe("formatTimestamp", () => {
    it.each([
        [3661000, "01:01:01"],
        [61000, "01:01"],
        [3600000, "01:00:00"],
        [0, "00:00"],
        [-5000, "00:00"]
    ])("for %p timestamp should format correctly as %p", (timestamp: number, expectedFormat: string) => {
        const formatted = formatTimestamp(timestamp);
        expect(formatted).toEqual(expectedFormat);
    });
});
