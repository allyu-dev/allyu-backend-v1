variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "service_name" {
  type    = string
  default = "allyu-demo"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,48}[a-z0-9]$", var.service_name))
    error_message = "Use 2-50 lowercase letters, digits or hyphens; start with a letter."
  }
}

variable "power" {
  type    = string
  default = "nano"
  validation {
    condition     = contains(["nano", "micro", "small"], var.power)
    error_message = "For this demo choose nano, micro or small."
  }
}

variable "github_repository" {
  description = "Exact case-sensitive GitHub owner/repository allowed to deploy from main."
  type        = string
  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Provide owner/repository."
  }
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN, or null to create one (one per AWS account)."
  type        = string
  default     = null
}
