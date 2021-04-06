module.exports = async ({negotiateProtocol}) => {
	negotiateProtocol(['experimental']).ready();
};
