export default {
	extends: "../../api-extractor.json",
	mainEntryPointFilePath: "./dist/packages/<unscopedPackageName>/lib/index.d.ts",
	dtsRollup: {
		untrimmedFilePath: "./dist/<unscopedPackageName>.d.ts"
	}
};
