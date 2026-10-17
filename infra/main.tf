provider "aws" {
  region = var.aws_region
  default_tags {
    tags = { Project = "Allyu", Environment = "demo", ManagedBy = "Terraform" }
  }
}

resource "aws_lightsail_container_service" "api" {
  name  = var.service_name
  power = var.power
  scale = 1
  private_registry_access {
    ecr_image_puller_role { is_active = true }
  }
}

resource "aws_ecr_repository" "api" {
  name                 = var.service_name
  image_tag_mutability = "IMMUTABLE"
  # Demo cleanup: terraform destroy also removes images.
  force_delete = true
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository_policy" "lightsail" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = aws_lightsail_container_service.api.private_registry_access[0].ecr_image_puller_role[0].principal_arn
      }
      Action = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
    }]
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.github_oidc_provider_arn == null ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "deploy" {
  name = "${var.service_name}-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = var.github_oidc_provider_arn != null ? var.github_oidc_provider_arn : aws_iam_openid_connect_provider.github[0].arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage",
          "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:DescribeImages"
        ]
        Resource = aws_ecr_repository.api.arn
      },
      {
        Effect   = "Allow"
        Action   = ["lightsail:CreateContainerServiceDeployment"]
        Resource = aws_lightsail_container_service.api.arn
      },
      {
        Effect    = "Allow"
        Action    = ["lightsail:GetContainerServices"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:RequestedRegion" = var.aws_region } }
      }
    ]
  })
}
