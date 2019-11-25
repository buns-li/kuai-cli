import path from "path";
import fs from "fs-extra";
import execa from "execa";
import { sortObject } from "../../utils";
import { PackageInfo } from "../package-info";

/**
 *
 * 利用`lerna create packagename`的命令行形式来创建包
 *
 *   主要利用lerna的良好monorepo支持
 *
 * @param pkgInfo monorepo项目中当前包的信息数据
 */
export async function callLernaCreate(pkgInfo: PackageInfo): Promise<void> {
	await execa("lerna", ["create", pkgInfo.fullname, `--description=${pkgInfo.fullname}`, "--yes"], {
		stdio: "ignore"
	});
	// 移除原来创建的js文件
	await fs.remove(path.resolve(pkgInfo.libPath, `${pkgInfo.dirname}.js`));
}

/**
 *
 * 构建包的api-extractor.json文件
 *
 * @param pkgInfo monorepo项目中当前包的信息数据
 */
export async function generateApiExtractor(pkgInfo: PackageInfo): Promise<void> {
	const apiExtractorPath = path.resolve(pkgInfo.path, "api-extractor.json");
	// 创建api-extractor.json
	await fs.writeFile(
		apiExtractorPath,
		JSON.stringify(await import("../../tpl/api-extractor").then(a => a.default), null, 2)
	);
}

/**
 *
 * 针对lib类型项目的优化
 *
 *   tsconfig.json中的paths实现自动填充(智能提示)
 *
 * @param pkgInfo monorepo项目中当前包的信息数据
 */
export async function perfTSConfigPathsOfLib(pkgInfo: PackageInfo): Promise<void> {
	const tsconfigPath = path.resolve(pkgInfo.root, "tsconfig.json");
	if (!fs.existsSync(tsconfigPath)) return;
	// 更新根目录下的tsconfig.json中的paths信息
	const tsConfig = await fs.readJSON(tsconfigPath);
	tsConfig.compilerOptions.paths = tsConfig.compilerOptions.paths || {};
	tsConfig.compilerOptions.paths[pkgInfo.fullname] = [`packages/${pkgInfo.dirname}/lib/index.ts`];
	await fs.writeFile(tsconfigPath, JSON.stringify(tsConfig, null, 2));
}

/**
 *
 * 转换指定包对应的package.json文件内容
 *
 * @param pkgInfo monorepo项目中当前包的信息数据
 * @param [depPkgs] 当前包所需要依赖的其他包的信息,形式: [[包名,包版本],...]
 */
export async function transformPKJ(pkgInfo: PackageInfo, depPkgs?: string[][]): Promise<void> {
	// 更新package.json中的依赖包选项
	if (depPkgs && depPkgs.length) {
		pkgInfo.pkgData.dependencies = depPkgs.reduce((prev, cur) => {
			prev[cur[0]] = cur[1];
			return prev;
		}, pkgInfo.pkgData.dependencies || {});
	}

	pkgInfo.pkgData.keywords = pkgInfo.fullname.split("/");
	pkgInfo.pkgData.license = "MIT";
	pkgInfo.pkgData.version = "1.0.0";

	await fs.writeFile(
		path.resolve(pkgInfo.path, "./package.json"),
		JSON.stringify(
			sortObject(pkgInfo.pkgData, [
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
				"browser",
				"style",
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
}

/**
 * 调整当前包对应的package.json中的内容
 *   包的项目类型: lib@monorepo
 *
 * @export
 * @param {PackageInfo} pkgInfo
 */
export function transformPkgDataOfLib(pkgInfo: PackageInfo): PackageInfo {
	const prefix = `dist/${pkgInfo.dirname}`;

	pkgInfo.pkgData.module = `${prefix}.esm.js`;
	pkgInfo.pkgData.jsnext = `${prefix}.mjs`;
	pkgInfo.pkgData.main = `${prefix}.cjs.js`;
	pkgInfo.pkgData.browser = `${prefix}.js`;
	pkgInfo.pkgData.unpkg = `${prefix}.min.js`;
	pkgInfo.pkgData.types = `${prefix}.d.ts`;
	pkgInfo.pkgData.kuai = pkgInfo.pkgData.kuai || {
		buildOptions: {
			formats: ["esm", "cjs", "global", "esm-browser"],
			external: null,
			onlyProd: false
		}
	};

	return pkgInfo;
}

/**
 * 调整当前包对应的package.json中的内容
 *   包的项目类型: ui@vue
 *
 * @export
 * @param {PackageInfo} pkgInfo
 */
export function transformPkgDataOfUIVue(pkgInfo: PackageInfo): PackageInfo {
	const prefix = `dist/${pkgInfo.dirname}`;
	pkgInfo.pkgData.main = `${prefix}.js`;
	pkgInfo.pkgData.unpkg = `${prefix}.min.js`;
	pkgInfo.pkgData.style = `${prefix}.css`;
	pkgInfo.pkgData.types = `types/${pkgInfo.dirname}.d.ts`;
	pkgInfo.pkgData.files = ["types"];

	return pkgInfo;
}

export async function supportVue(pkgInfo: PackageInfo, depPkgs?: string[][]): Promise<void> {
	/**
	 * 包的类型声明定义
	 */
	await fs.mkdirp(path.resolve(pkgInfo.path, "types"));
	await fs.writeFile(
		path.resolve(pkgInfo.path, `types/${pkgInfo.dirname}.d.ts`),
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
		allPkgDirs.reduce(
			(prev, cur) => prev + `export * from "../packages/${cur.dirname}/types/${cur.dirname}"\n`,
			""
		),
		{ encoding: "utf-8" }
	);

	await transformPKJ(transformPkgDataOfUIVue(pkgInfo), depPkgs);
}

export async function supportLib(pkgInfo: PackageInfo, depPkgs?: string[][]): Promise<void> {
	await fs.writeFile(path.resolve(pkgInfo.libPath, "index.ts"), "");

	await generateApiExtractor(pkgInfo);

	await perfTSConfigPathsOfLib(pkgInfo);

	await transformPKJ(transformPkgDataOfLib(pkgInfo), depPkgs);
}
