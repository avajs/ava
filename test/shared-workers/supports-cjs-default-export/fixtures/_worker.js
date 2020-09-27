exports.default = ({negotiateProtocol}) => {
	negotiateProtocol(['experimental']).ready();
};
