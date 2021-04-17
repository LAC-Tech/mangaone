type ReadonlyStream<T> = {
 	onChange: (f: (target: T) => void) => void
  pull: () => T
	map: <T1>(callBack: Mapper<T, T1>) => ReadonlyStream<T1>
	reduce: <T1>(callback: Reducer<T, T1>, initial: T1) => ReadonlyStream<T1>
	filter: (callback: Filterer<T>, initial: T) => ReadonlyStream<T>
}

type Distribute<T> = T extends [u: infer U, ...v: infer V] ? [U[], ...Distribute<V>] : [];
type StreamOutputs<Ss extends Array<ReadonlyStream<any>>> = {
  [K in keyof Ss]:  Ss[K] extends ReadonlyStream<infer T> ? T : never
}

type Mapper<S, T> = (source: S) => T
type Reducer<S, T> = (target: T, source: S) => T
type Filterer<S> = (source: S) => boolean

class Stream<S extends unknown, T> {
	#callback; #state
	#listeners = [] as Array<(target: T) => void>

	constructor(callback: (target: T, source: S) => T, state: T) {
		this.#callback = callback
		this.#state = state
	}

	push(...newVals: S[]) {
		for(const newVal of newVals) {
			this.#state = this.#callback(this.#state, newVal)
			for(const listener of this.#listeners) 
				listener(this.#state)
		}
	}

	onChange(newListener: (target: T) => void) {
		this.#listeners.push(newListener)
	}

	pull() { return this.#state }

	map<T1>(callback: Mapper<T, T1>): ReadonlyStream<T1> {
		const result = Stream.mapped(callback, this.pull())
		this.onChange(newVal => result.push(newVal))	
		return result
	}

	reduce<T1>(callback: Reducer<T, T1>, initial: T1) {
		const result = Stream.reduced(callback, initial)
		this.onChange(newVal => result.push(newVal))	
		return result 
	}

	filter(callback: Filterer<T>) {
		const result = Stream.create(this.pull())
		this.onChange(newVal => {
			if (callback(newVal))	{
				result.push(newVal)
			}
		})
		return result
	}

	static create: <A>(initial: A) => Stream<A, A> = initial =>
		new Stream((_, target) => target, initial)

	static mapped = <A, B>(callback: (source: A) => B, initial: A): Stream<A, B> =>
		new Stream((_, newVal) => callback(newVal), callback(initial))

	static reduced = <A, B>(callback: Reducer<A, B>, initial: B) => 
		new Stream(callback, initial)

	static combine = <Result, Inputs extends Array<ReadonlyStream<any>>>(
		...inputStreams: Inputs
	): ReadonlyStream<StreamOutputs<Inputs>> => {
		const initial = inputStreams.map(is => is.pull()) as StreamOutputs<Inputs>
		const result = Stream.mapped(_ => _, initial)
		
		for(let i = 0; i < inputStreams.length; i++) { 
			inputStreams[i].onChange(newVal => {
				initial[i] = newVal
				result.push(initial)
			})
		}
	
		return result
	}
}

export default Stream
