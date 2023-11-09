export async function * asyncEventIteratorFromApi(api) {
	// TODO: support multiple runs (watch mode)
	const {value: plan} = await api.events('run').next();

	for await (const stateChange of plan.status.events('stateChange')) {
		yield stateChange;

		if (stateChange.type === 'end' || stateChange.type === 'interrupt') {
			break;
		}
	}
}
