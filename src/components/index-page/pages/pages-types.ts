export interface PagesDomain {
  name: string;
}

export interface PagesProjectSourceConfig {
  owner?: string;
  repo_name?: string;
}

export interface PagesProjectSource {
  type?: string;
  config?: PagesProjectSourceConfig;
}

export interface PagesStage {
  name?: string;
  status?: string;
}

export interface PagesProductionDeployment {
  environment?: string;
  url?: string;
  latest_stage?: PagesStage;
  created_on?: string;
}

export interface PagesProjectSummary {
  id?: string;
  name: string;
  subdomain?: string;
  created_on: string;
  production_deployment?: PagesProductionDeployment;
  domains?: Array<string | PagesDomain>;
  source?: PagesProjectSource;
}

export interface PagesDeploymentBuildConfig {
  build_command?: string;
}

export interface PagesDeploymentTriggerMetadata {
  commit_message?: string;
  branch?: string;
}

export interface PagesDeploymentTrigger {
  metadata?: PagesDeploymentTriggerMetadata;
}

export interface PagesDeploymentSummary {
  id: string;
  environment?: string;
  latest_stage?: PagesStage;
  url?: string;
  created_on?: string;
  build_config?: PagesDeploymentBuildConfig;
  deployment_trigger?: PagesDeploymentTrigger;
}
