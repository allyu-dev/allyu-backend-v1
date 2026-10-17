# Despliegue académico en AWS

## Arquitectura y alcance

La fase 1 utiliza **Lightsail Containers (un nodo) + ECR privado + Terraform**.
Firebase Authentication y Firestore continúan en Firebase. No se crea una base de
datos en AWS ni se migran los datos. El servicio publica HTTPS con el dominio
predeterminado de Lightsail y comprueba `GET /health` en el puerto 3000.

Terraform administra servicio, repositorio, permiso de lectura de imágenes y rol
OIDC de GitHub. El script de entrega administra las versiones del contenedor.
No definir `aws_lightsail_container_service_deployment_version` en paralelo:
introduciría dos propietarios de la misma configuración y secretos en el estado.
El flujo existente de GHCR se conserva; la entrega a AWS publica otra imagen en ECR.

## 1. Crear infraestructura

Requisitos: Terraform >= 1.6, proveedor AWS 6.x, AWS CLI con credenciales del
operador y permisos para crear Lightsail, ECR, roles/políticas IAM y OIDC.
Ejecutar desde la raíz Git `allyu-backend/`:

```powershell
aws sts get-caller-identity
cd infra
Copy-Item terraform.tfvars.example terraform.tfvars
# Editar github_repository con el propietario/repositorio real (respetar mayúsculas).
terraform init
terraform fmt -check
terraform validate
terraform plan -out=demo.tfplan
terraform apply demo.tfplan
terraform output
```

Usar una región con Lightsail Containers, por ejemplo `us-east-1`. Si la cuenta
ya tiene el proveedor OIDC `token.actions.githubusercontent.com`, indicar su ARN
en `github_oidc_provider_arn`; no crear un segundo proveedor. Los recursos
existentes con el mismo nombre deben importarse o debe elegirse otro nombre.

La creación por sí sola aún no ejecuta la API: falta entregar la primera imagen.
El estado local debe conservarse fuera de Git, en un lugar seguro. Para trabajo
compartido, migrar posteriormente a un backend remoto con bloqueo. Confirmar
`.terraform.lock.hcl` generado por `terraform init` en Git para fijar dependencias.

## 2. Configurar GitHub Actions

En **Settings > Secrets and variables > Actions**, crear estas variables de
repositorio con las salidas de Terraform:

| Variable | Salida de Terraform |
| --- | --- |
| `AWS_REGION` | `aws_region` |
| `LIGHTSAIL_SERVICE_NAME` | `service_name` |
| `ECR_REPOSITORY_URL` | `ecr_repository_url` |
| `AWS_DEPLOY_ROLE_ARN` | `github_deploy_role_arn` |

Crear el secreto de repositorio `FIREBASE_SERVICE_ACCOUNT_JSON` con el JSON
completo de una cuenta de servicio del proyecto Firebase de demostración.
No guardarlo en variables normales, archivos versionados, Docker ni tfvars.
El rol de entrega solo confía en la rama `main` del repositorio configurado,
y utiliza credenciales temporales OIDC; no requiere access keys de AWS.
No añadir un GitHub Environment sin adaptar también la condición `sub` del rol.

**Límite de Lightsail:** el JSON se entrega como variable de entorno; no es una
referencia nativa a Secrets Manager. Usuarios con permisos para consultar las
versiones del servicio pueden leerlo. Restringir esos permisos, usar un proyecto
Firebase de demo y rotar la clave al terminar. El estado Terraform no lo contiene.
El script usa un archivo temporal privado, lo elimina y evita imprimir respuestas
AWS que podrían contenerlo. No habilitar `--debug` ni trazas del shell.

## 3. Publicar y verificar

Integrar los cambios en `main`. En **Actions > Deploy Lightsail demo > Run
workflow**, seleccionar `main`. El despliegue es manual para evitar gastos por
cada push. Primero valida formato, compilación y pruebas del script; luego publica
una imagen `linux/amd64` en ECR con etiqueta única y despliega su digest exacto.
Espera hasta que esa versión esté activa y verifica `/health`. Si falla, el flujo
termina con error; revisar el estado y logs de Lightsail antes de reintentar.
No se promete rollback automático desde el script.

```powershell
$url = terraform -chdir=infra output -raw service_url
Invoke-RestMethod "$($url.TrimEnd('/'))/health"
# Verificar además las rutas privadas con un Firebase ID Token del proyecto demo.
```

`/health` comprueba HTTP, no el acceso real a Firestore. Verificar también el
catálogo de roles y una operación de usuario autenticada. Cargar el catálogo una
sola vez con `npm run seed:roles` desde una máquina autorizada: el seeding no
forma parte del arranque. Si se incorpora un frontend en otro origen, configurar
CORS en Express antes de probarlo desde el navegador.

Para volver a una imagen anterior, obtener su digest en ECR y ejecutar el mismo
script con `DEPLOY_IMAGE`, `LIGHTSAIL_SERVICE_NAME`, `AWS_REGION` y
`FIREBASE_SERVICE_ACCOUNT_JSON` en el entorno, usando credenciales AWS autorizadas:

```powershell
node scripts/deploy-lightsail.mjs
```

No eliminar imágenes referenciadas por versiones que quieras volver a desplegar.

## Costos y limpieza

Elegir `nano` inicialmente y medir memoria; cambiar `power` a `micro` y aplicar
Terraform si es necesario. Se factura el servicio y, por separado, almacenamiento
ECR, transferencia aplicable y consumo Firebase. No asumir cobertura gratuita.
Para terminar la demo, revisar y destruir **solo este entorno**:

```powershell
terraform -chdir=infra plan -destroy
terraform -chdir=infra destroy
```

El repositorio ECR tiene `force_delete = true`: destruir elimina también sus
imágenes. El proveedor OIDC solo se elimina si este estado lo creó; si otros
proyectos empiezan a usarlo, convertirlo en infraestructura compartida antes de
la limpieza. Firebase y sus datos no son administrados ni borrados por Terraform.
Eliminar el secreto de GitHub y revocar la clave Firebase cuando ya no se necesiten.

## Fase 2: Kubernetes

Se mantienen sin cambios `k8s/deployment.yaml` y `k8s/service.yaml`: usan tres
réplicas y el secreto `allyu-firebase-admin` montado en
`/app/serviceAccountKey.json`. La aplicación sigue aceptando ese archivo cuando
`FIREBASE_SERVICE_ACCOUNT_JSON` no está definido; Compose conserva el mismo flujo.

Para una segunda fase habrá que crear namespace `allyu` y el secreto fuera de
Git, reemplazar `allyu-backend:local` por una imagen accesible al clúster y
configurar entrada HTTPS. `ClusterIP` solo expone dentro del clúster. En EKS,
configurar además permisos para descargar ECR. La infraestructura actual no crea
un clúster ni modifica los manifiestos para asumir uno.

## Validación local

```powershell
npm ci
npm run format:check
npm run build
node --test scripts/deploy-lightsail.test.mjs
terraform -chdir=infra fmt -check
terraform -chdir=infra init -backend=false
terraform -chdir=infra validate
```

`npm test` sigue siendo el placeholder original; las pruebas de entrega se
invocan explícitamente. No se necesita Firebase real para estas pruebas.
