{{/*
Expand the name of the chart.
*/}}
{{- define "roadmap.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "roadmap.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "roadmap.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels for a given component (web | worker)
*/}}
{{- define "roadmap.selectorLabels" -}}
app.kubernetes.io/name: {{ include "roadmap.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Image reference for a component
*/}}
{{- define "roadmap.image" -}}
{{ .Values.global.image.registry }}/{{ .imageName }}:{{ .Values.global.image.tag }}
{{- end }}

{{/*
Environment variables from existingSecret + commonEnv
*/}}
{{- define "roadmap.commonEnvFrom" -}}
- secretRef:
    name: {{ .Values.existingSecret }}
{{- end }}

{{- define "roadmap.commonEnv" -}}
{{- range $k, $v := .Values.commonEnv }}
- name: {{ $k }}
  value: {{ $v | quote }}
{{- end }}
{{- end }}
