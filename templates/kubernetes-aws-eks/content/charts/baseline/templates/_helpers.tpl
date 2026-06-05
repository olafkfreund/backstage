{{/*
Common helpers for the baseline chart.
*/}}

{{- define "baseline.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "baseline.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "baseline.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "baseline.labels" -}}
app.kubernetes.io/name: {{ include "baseline.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end -}}
