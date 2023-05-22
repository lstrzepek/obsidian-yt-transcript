export const formatTimestamp = (t: number): string => {
	if(t<0) return '00:00';
	const fnum = (n: number):string => `${n|0}`.padStart(2,'0');
	const s = 1000;
	const m = 60 * s;
	const h = 60 * m;
	const hours = Math.floor(t / h);
	const minutes = Math.floor((t - hours * h) / m);
	const seconds = Math.floor((t - hours * h - minutes * m) / s);
	const time = hours ? [hours, minutes, seconds] : [minutes, seconds];
	return time.map(fnum).join(':')
}
