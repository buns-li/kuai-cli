export type KV<T> = { [key: string]: T };

export type ProjectType = "node-lib" | "web-lib" | "web-ui";

export type CssPreProcessorType = "sass" | "less" | "stylus";

export type UIFrameType = "vue" | "react";

export interface KuaiMonoRepo {
	independent: boolean;
}

export type BranchType =
	| "master"
	| "lib@monorepo"
	| "lib@single"
	| "ui@vue"
	| "ui@react"
	| "ui@uniapp"
	| "ui@taro"
	| "cmp@vue"
	| "cmp@react"
	| "cmp@uniapp"
	| "cmp@taro";

export interface KuaiBuildOptions {
	formats: string[];
	external?: string | null;
	onlyProd?: boolean;
}

export interface KuaiConfig {
	/**
	 * 当前项目名称
	 */
	appName?: string;
	/**
	 * 当前目录
	 */
	cwd?: string;
	/**
	 * 远程仓储地址
	 */
	repo?: string;
	/**
	 * 远程分支地址
	 */
	branch?: BranchType;
	/**
	 * ui組件的前綴
	 */
	uiPrefix?: string;

	buildOptions?: KuaiBuildOptions;
}

export interface PublishConfigData {
	registry?: string;
}

export interface RepositoryData {
	type?: string;
	url?: string;
	directory?: string;
}

export interface PkgData {
	name?: string;
	version?: string;
	description?: string;
	homepage?: string;
	license?: string;
	author?: string;
	main?: string;
	module?: string;
	jsnext?: string;
	browser?: string;
	unpkg?: string;
	style?: string;
	types?: string;
	typeings?: string;
	private?: boolean;
	engines?: KV<string>;
	files?: string[];
	keywords?: string[];
	workspaces?: string[];
	os?: string[];
	cpu?: string[];
	dependencies?: KV<string>;
	devDependencies?: KV<string>;
	peerDependencies?: KV<string>;
	scripts?: KV<string>;
	bin?: KV<string>;
	repository?: RepositoryData;
	publishConfig?: PublishConfigData;
	kuai?: KuaiConfig;
}
