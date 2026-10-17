output "service_name" { value = aws_lightsail_container_service.api.name }
output "service_url" { value = aws_lightsail_container_service.api.url }
output "aws_region" { value = var.aws_region }
output "ecr_repository_url" { value = aws_ecr_repository.api.repository_url }
output "github_deploy_role_arn" { value = aws_iam_role.deploy.arn }
