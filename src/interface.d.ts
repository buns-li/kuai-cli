export type KV<T> = { [key: string]: T };

export type ProjectType = "node-lib" | "web-lib" | "web-ui";

export type CssPreProcessorType = "sass" | "less" | "stylus";

export type UIFrameType = "vue" | "react";

export interface KuaiMonoRepo {
	independent: boolean;
}

export interface KuaiConfig {
	/**
	 * 当前项目名称
	 */
	appName: string;
	/**
	 * 当前目录
	 */
	cwd: string;
	/**
	 * 远程仓储地址
	 */
	repo?: string;
	/**
	 * 远程分支地址
	 */
	branch?: string;
	/**
	 * 项目类型
	 */
	projectType?: ProjectType;
	/**
	 * 是否是monorepo风格项目
	 */
	monorepo?: boolean | KuaiMonoRepo;
	/**
	 * 是否采用Typescript
	 */
	ts: boolean;
	/**
	 * UI框架
	 */
	uiFrame?: UIFrameType;
	/**
	 * css预处理器
	 */
	cssPreProcessor?: CssPreProcessorType;
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
	esm?: string;
	unpkg?: string;
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
