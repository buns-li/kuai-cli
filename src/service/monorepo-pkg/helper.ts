import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import execa from "execa";
import { sortObject, getUIPrefix, toCamelCase, getPkgData, startSpinner } from "../../utils";
import { BranchType, PkgData, KuaiConfig } from "../../interface";

export interface PackageInfo {
	/**
	 * 当前包所在的项目根目录
	 */
	root: string;
	/**
	 * 当前packages的工作目录
	 */
	cwd: string;
	/**
	 * 全名
	 */
	fullname: string;
	/**
	 * package对应的目录名称
	 */
	dirname: string;
	/**
	 * camel-case风格的命名
	 */
	camelCaseName: string;
	/**
	 * package对应的完整物理路径
	 */
	path: string;
	/**
	 * package中lib文件夹对应的物理路径
	 */
	libPath: string;
	/**
	 * package中test文件夹对应的物理路径
	 */
	testPath: string;
	/**
	 * 使用的方式
	 */
	usage: BranchType;
	/**
	 * package.json数据
	 */
	pkgData: PkgData;

	siblings: PackageInfo[];
}

/**
 *
 * 获取packages中某个包的信息
 *
 * @param pkgPath 该包的物理路径
 * @param kuai 整个项目的kuai配置信息
 *
 * @returns 包信息
 */
export function getPackageInfo(pkgPath: string, kuai: KuaiConfig, pkgFullName?: string): PackageInfo {
	const dirname = path.basename(pkgPath);

	const uiPrefix = getUIPrefix(kuai);

	const purePkgName = dirname.replace(uiPrefix, "");

	const camelCaseName = toCamelCase(
		uiPrefix.toUpperCase() + "-" + purePkgName[0].toUpperCase() + purePkgName.substring(1)
	);

	const cwd = path.resolve(pkgPath, "../");

	const pkgData = pkgFullName ? ({ name: pkgFullName } as PkgData) : getPkgData(pkgPath);

	return {
		root: path.resolve(cwd, "../"),
		cwd,
		dirname,
		fullname: pkgData.name,
		camelCaseName,
		path: pkgPath,
		libPath: path.resolve(pkgPath, `./lib/`),
		testPath: path.resolve(pkgPath, `./test/`),
		usage: kuai.branch,
		pkgData,
		siblings: fs
			.readdirSync(cwd)
			.map(f => path.resolve(cwd, f))
			.filter(f => f !== pkgPath && fs.statSync(f).isDirectory())
			.map(f => getPackageInfo(f, kuai))
	} as PackageInfo;
}

export async function doLernaCreate(pkgInfo: PackageInfo): Promise<void> {
	await execa("lerna", ["create", pkgInfo.fullname, `--description=${pkgInfo.fullname}`, "--yes"], {
		stdio: "ignore"
	});
	// 移除原来创建的js文件
	await fs.remove(path.resolve(pkgInfo.libPath, `${pkgInfo.dirname}.js`));
}

export async function supportVue(pkgInfo: PackageInfo): Promise<void> {
	/**
	 * 包的类型声明定义
	 */
	await fs.mkdirp(path.resolve(pkgInfo.path, "types"));
	await fs.writeFile(
		path.resolve(pkgInfo.path, "types/index.d.ts"),
		`import Vue from "vue";

export declare class ${pkgInfo.camelCaseName} extends Vue {
	/** Install component into Vue */
	static install(vue: typeof Vue):void; 
}`
	);

	await fs.writeFile(
		path.resolve(pkgInfo.libPath, "index.jsx"),
		`export default {
	name:"${pkgInfo.camelCaseName}",
	render(){
		/**
		 * render JSX 
		 **/
		return;
	}
}`,
		{ encoding: "utf-8" }
	);

	await fs.writeFile(path.resolve(pkgInfo.libPath, "index.scss"), "", { encoding: "utf-8" });

	/**
	 * 包的组件文件定义
	 */
	await fs.writeFile(
		path.resolve(pkgInfo.path, "index.js"),
		`import ${pkgInfo.camelCaseName} from "./lib/index.jsx";

		${pkgInfo.camelCaseName}.install = function(Vue) {
			Vue.component(${pkgInfo.camelCaseName}.name, ${pkgInfo.camelCaseName});
		};
		
		if (typeof window !== "undefined" && window.Vue) {
			${pkgInfo.camelCaseName}.install(window.Vue);
		}
		
		export default ${pkgInfo.camelCaseName};`,
		{ encoding: "utf-8" }
	);

	/**
	 * 包的rollup构建文件
	 */
	await fs.writeFile(
		path.resolve(pkgInfo.path, "build.js"),
		`;
import "./lib/index.scss";
import ${pkgInfo.camelCaseName} from "./index"

export default ${pkgInfo.camelCaseName};`,
		{ encoding: "utf-8" }
	);

	const allPkgDirs = pkgInfo.siblings.concat(pkgInfo).sort((a, b) => (a.dirname > b.dirname ? 1 : -1));

	// 更新components.js文件
	await fs.writeFile(
		path.resolve(pkgInfo.cwd, "components.js"),
		allPkgDirs.reduce((prev, cur) => {
			prev += `export * from "./${cur.dirname}/";\n`;
			return prev;
		}, ""),
		{ encoding: "utf-8" }
	);

	// 更新components.js文件
	await fs.writeFile(
		path.resolve(pkgInfo.cwd, "components.scss"),
		allPkgDirs.reduce((prev, cur) => {
			prev += `@import "./${cur.dirname}/lib/index.scss";\n`;
			return prev;
		}, ""),
		{ encoding: "utf-8" }
	);

	// 更新最外部的types定义文件
	await fs.writeFile(
		path.resolve(pkgInfo.root, "types/index.d.ts"),
		allPkgDirs.reduce((prev, cur) => prev + `export * from "../packages/${cur.dirname}/types/index"\n`, ""),
		{ encoding: "utf-8" }
	);
}

export async function useLernaCreate(pkgDir: string, pkgName: string, isTS: boolean): Promise<void> {
	const pkgDirName = path.basename(pkgDir);
	await execa(`lerna`, ["create", pkgName, `--description=${pkgName}`, "--yes"], { stdio: "inherit" });
	await fs.remove(path.resolve(pkgDir, `lib/${pkgDirName}.js`));
	await fs.writeFile(path.resolve(pkgDir, `lib/index.${isTS ? "ts" : "js"}`), "");
}

export async function lernaCreateInUI(pkgPath: string, pkgFullName: string): Promise<void> {
	const pkgDirName = path.basename(pkgPath);
	await execa(`lerna`, ["create", pkgFullName, `--description=${pkgFullName}`, "--yes"], { stdio: "inherit" });
	await fs.remove(path.resolve(pkgPath, `lib/${pkgDirName}.js`));
}

export async function createApiExtractor(pkgDir: string, apiExtractorContent: any): Promise<void> {
	const apiExtractorPath = path.resolve(pkgDir, "api-extractor.json");
	// 创建api-extractor.json
	await fs.writeFile(apiExtractorPath, JSON.stringify(apiExtractorContent, null, 2));
	console.log(chalk.green(`${chalk.greenBright("✔")} Created ${apiExtractorPath}!`));
}

export async function updateTSConfigPaths(pkgDir: string, pkgFullName: string): Promise<void> {
	const tsconfigPath = path.resolve(pkgDir, "../../tsconfig.json");

	if (!fs.existsSync(tsconfigPath)) return;

	const pkgDirName = path.basename(pkgDir);

	// 更新根目录下的tsconfig.json中的paths信息
	const tsConfig = await fs.readJSON(tsconfigPath);
	tsConfig.compilerOptions.paths = tsConfig.compilerOptions.paths || {};
	tsConfig.compilerOptions.paths[pkgFullName] = [`packages/${pkgDirName}/lib/index.ts`];
	await fs.writeFile(tsconfigPath, JSON.stringify(tsConfig, null, 2));
	console.log(chalk.green(`${chalk.greenBright("✔")} Updated "CompilerOptions.paths" in ${tsconfigPath}!`));
}

export async function updateUIPkgDotJson(pkgDir: string, pkgFullName: string, depPkgs: string[][]): Promise<void> {
	const pkgJSONPath = path.resolve(pkgDir, `package.json`);
	const pkgData = await fs.readJSON(pkgJSONPath);
	pkgData.keywords = pkgFullName.split("/");
	pkgData.license = "MIT";
	pkgData.main = `dist/index.js`;
	pkgData.unpkg = `dist/index.min.js`;
	pkgData.style = `dist/index.css`;
	pkgData.types = `types/index.d.ts`;
	pkgData.files = ["types"];

	// 更新package.json中的依赖包选项
	if (depPkgs && depPkgs.length) {
		pkgData.dependencies = depPkgs.reduce((prev, cur) => {
			prev[cur[0]] = cur[1];
			return prev;
		}, pkgData.dependencies || {});
	}

	await fs.writeFile(
		pkgJSONPath,
		JSON.stringify(
			sortObject(pkgData, [
				"name",
				"version",
				"description",
				"license",
				"private",
				"workspaces",
				"main",
				"unpkg",
				"style",
				"types",
				"directories",
				"files",
				"author",
				"repository",
				"kuai",
				"scripts",
				"dependencies",
				"devDependencies"
			]),
			null,
			2
		)
	);
}

export async function updatePkgPackageDotJson(pkgDir: string, pkgFullName: string, depPkgs: string[][]): Promise<void> {
	const pkgJSONPath = path.resolve(pkgDir, `package.json`);
	const pkgDirName = path.basename(pkgDir);

	const pkgData = await fs.readJSON(pkgJSONPath);
	pkgData.keywords = pkgFullName.split("/");
	pkgData.license = "MIT";
	pkgData.module = `dist/${pkgDirName}.esm.js`;
	pkgData.jsnext = `dist/${pkgDirName}.mjs`;
	pkgData.main = `dist/${pkgDirName}.cjs.js`;
	pkgData.browser = `dist/${pkgDirName}.js`;
	pkgData.unpkg = `dist/${pkgDirName}.min.js`;
	pkgData.types = `dist/${pkgDirName}.d.ts`;
	pkgData.kuai = pkgData.kuai || {
		buildOptions: {
			formats: ["esm", "cjs", "global", "esm-browser"],
			external: null,
			onlyProd: false
		}
	};
	// 更新package.json中的依赖包选项
	if (depPkgs && depPkgs.length) {
		pkgData.dependencies = depPkgs.reduce((prev, cur) => {
			prev[cur[0]] = cur[1];
			return prev;
		}, pkgData.dependencies || {});
	}
	await fs.writeFile(
		pkgJSONPath,
		JSON.stringify(
			sortObject(pkgData, [
				"name",
				"version",
				"description",
				"license",
				"private",
				"workspaces",
				"module",
				"jsnext",
				"main",
				"unpkg",
				"types",
				"typings",
				"directories",
				"files",
				"author",
				"repository",
				"kuai",
				"scripts",
				"dependencies",
				"devDependencies"
			]),
			null,
			2
		)
	);
	console.log(chalk.green(`${chalk.greenBright("✔")} Updated ${pkgJSONPath}!`));
}
