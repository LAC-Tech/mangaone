import "stream"
import Stream from "../index"

const doubleFn = (x: number) => x * 2
const sumFn = ([x, y]: number[]) => x + y
const identifyLift = <T>(x: T) => x

describe('dependent streams', function() {
	it('updates dependencies', function() {
		const x = Stream.create(3);
		const x2 = x.map(doubleFn)
		expect(x2.pull()).toEqual(x.pull() * 2)
	});

	it('can set result by returning value', function() {
		const x = Stream.create(3);
		const y = Stream.create(4);
		const sum = Stream.combine(x, y).map(sumFn)
		expect(sum.pull()).toEqual(x.pull() + y.pull());
	});

	it('is updated when dependencies change', function() {
		const x = Stream.create(3);
		const y = Stream.create(4);
		const sum = Stream.combine(x, y).map(sumFn);
		expect(sum.pull()).toEqual(x.pull() + y.pull());
		x.push(12);
		expect(sum.pull()).toEqual(x.pull() + y.pull());
		y.push(8);
		expect(sum.pull()).toEqual(x.pull() + y.pull());	
	});

	it('can set result by calling callback', function() {
		const x = Stream.create(3);
		const y = Stream.create(4);
		let times = 0;
		const sum = Stream.combine(x, y).map(sumFn)
		sum.map(_ => {
			return times++;
		});
		expect(sum.pull()).toEqual(x.pull() + y.pull());
		x.push(12);
		expect(sum.pull()).toEqual(x.pull() + y.pull());
		y.push(8);
		expect(sum.pull()).toEqual(x.pull() + y.pull());
		expect(times).toEqual(3)
	});

	it('streams can lead into other streams', function() {
		const x = Stream.create(3);
		const y = Stream.create(4);
		const sum = Stream.combine(x, y).map(sumFn);
		const twiceSum = sum.map(doubleFn)
		const sumPlusDoubleSum = Stream.combine(twiceSum, sum).map(sumFn);
		x.push(12);
		expect(sumPlusDoubleSum.pull()).toEqual(sum.pull() * 3);
		y.push(3);
		expect(sumPlusDoubleSum.pull()).toEqual(sum.pull() * 3);
		x.push(2);
		expect(sumPlusDoubleSum.pull()).toEqual(sum.pull() * 3);
		expect(sumPlusDoubleSum.pull()).toEqual((2 + 3) * 3);
	});
    
	it('can get its own value', function() {
		const num = Stream.create(0);
		var sum = num.reduce((self, num) => {
			return (self || 0) + num
		}, 0)
		num.push(2, 3, 8, 7);
		expect(sum.pull()).toEqual(20);
	});

	it('handles dependencies when streams are triggered in streams', function() {
		const x = Stream.create(4);
		const y = Stream.create(3);
		const z = Stream.create(1);
		const doubleX = x.map(doubleFn);
		const setAndSum = Stream.combine(y, z).map(([y, z]) => {
			x.push(3);
			return z + y;
		})
		z.push(4);
		expect(setAndSum.pull()).toEqual(7);
		expect(doubleX.pull()).toEqual(6);
	});

	it('can filter values', function() {
		let result: number[] = [];
		const n = Stream.create(0);
		const lrg5 = n.filter(n => n > 5)
		lrg5.onChange(v => { 
			result.push(v)
		});
		n.push(4, 6, 2, 8, 3, 4)
		expect(result).toEqual([6, 8])
	});
});
