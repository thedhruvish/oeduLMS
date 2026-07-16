#!/bin/bash
# Script to create an IAM user with AdministratorAccess for OeduLMS deployment.
set -e

USER_NAME="OeduLMSDeployer"
POLICY_ARN="arn:aws:iam::aws:policy/AdministratorAccess"

echo "Creating IAM user: ${USER_NAME}..."
aws iam create-user --user-name "${USER_NAME}"

echo "Attaching policy ${POLICY_ARN} to user ${USER_NAME}..."
aws iam attach-user-policy --user-name "${USER_NAME}" --policy-arn "${POLICY_ARN}"

echo "Creating access keys for ${USER_NAME}..."
ACCESS_KEY_INFO=$(aws iam create-access-key --user-name "${USER_NAME}")

echo "IAM User and Access Keys created successfully!"
echo "------------------------------------------------"
echo "${ACCESS_KEY_INFO}"
echo "------------------------------------------------"
echo "IMPORTANT: Store the AccessKeyId and SecretAccessKey securely. You can use these credentials to configure the AWS CLI."
