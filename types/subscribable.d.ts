export interface Subscribable {
	subscribe(observer: {
		error(error: any): void;
		complete(): void;
	}): void;
}
