export default async ({negotiateProtocol}) => {
	negotiateProtocol(['experimental']).ready();
};
