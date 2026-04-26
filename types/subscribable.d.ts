export type Subscribable = {
	subscribe(observer: {
		error(error: any): void;
		complete(): void;
	}): void;
};
