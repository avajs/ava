module.exports = {
	"app": {
		"openDevToolsDetached"  : true,  // DEFAULT=FALSE; opens the dev tools windows detached in an own window.
		"hideMainWindow"        : true,  // DEFAULT=FALSE;  hides the main window to show dev tools only.
	},
	"workSpaceDirectory"        : function(argv) {  // determines the workspace directory for specific commandline applications.
		return __dirname
	}
};

