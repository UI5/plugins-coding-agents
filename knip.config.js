const config = {
	/**
	 * We only need dependency checking at the moment,
	 * so all checks except for dependencies are turned off.
	 */
	rules: {
		files: "off",
		duplicates: "off",
		unlisted: "off",
		binaries: "off",
		unresolved: "off",
		catalog: "off",
		exports: "off",
		types: "off",
		enumMembers: "off",
	}
};

export default config;