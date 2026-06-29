'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/StatePanels';

interface TaskTemplate {
  id: string;
  name: string;
  description?: string | null;
  defaultPriority: string;
  estimatedHours?: string | number | null;
  checklistJson?: string | null;
}

interface RecurringRule {
  id: string;
  title: string;
  cadence: string;
  isActive: boolean;
  nextRunAt: string;
  project?: { id: string; name: string } | null;
  template?: { id: string; name: string } | null;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface TaskTemplatesPanelProps {
  canManage: boolean;
}

export function TaskTemplatesPanel({ canManage }: TaskTemplatesPanelProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [templateName, setTemplateName] = useState('');
  const [templatePriority, setTemplatePriority] = useState('medium');
  const [templateHours, setTemplateHours] = useState('');
  const [templateChecklist, setTemplateChecklist] = useState('');

  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleProjectId, setRuleProjectId] = useState('');
  const [ruleCadence, setRuleCadence] = useState('weekly');
  const [ruleStartAt, setRuleStartAt] = useState('');
  const [ruleTemplateId, setRuleTemplateId] = useState('');

  function loadAll() {
    setIsLoading(true);
    Promise.all([
      apiRequest<ApiResponse<TaskTemplate[]>>('/tasks/templates'),
      apiRequest<ApiResponse<RecurringRule[]>>('/tasks/recurring-rules'),
      apiRequest<ApiResponse<ProjectOption[]>>('/projects'),
    ])
      .then(([templatesRes, rulesRes, projectsRes]) => {
        setTemplates(templatesRes.data);
        setRules(rulesRes.data);
        setProjects(projectsRes.data);
        if (projectsRes.data[0]) setRuleProjectId(projectsRes.data[0].id);
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreateTemplate(event: FormEvent) {
    event.preventDefault();
    if (!templateName.trim()) return;
    const checklist = templateChecklist
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    await apiRequest('/tasks/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: templateName.trim(),
        defaultPriority: templatePriority,
        estimatedHours: templateHours ? Number(templateHours) : undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
      }),
    });
    setTemplateName('');
    setTemplateHours('');
    setTemplateChecklist('');
    loadAll();
  }

  async function handleDeleteTemplate(id: string) {
    await apiRequest(`/tasks/templates/${id}`, { method: 'DELETE' });
    loadAll();
  }

  async function handleCreateRule(event: FormEvent) {
    event.preventDefault();
    if (!ruleTitle.trim() || !ruleProjectId || !ruleStartAt) return;
    await apiRequest('/tasks/recurring-rules', {
      method: 'POST',
      body: JSON.stringify({
        projectId: ruleProjectId,
        title: ruleTitle.trim(),
        cadence: ruleCadence,
        startAt: new Date(ruleStartAt).toISOString(),
        templateId: ruleTemplateId || undefined,
      }),
    });
    setRuleTitle('');
    setRuleStartAt('');
    setRuleTemplateId('');
    loadAll();
  }

  async function handleToggleRule(rule: RecurringRule) {
    await apiRequest(`/tasks/recurring-rules/${rule.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    loadAll();
  }

  async function handleDeleteRule(id: string) {
    await apiRequest(`/tasks/recurring-rules/${id}`, { method: 'DELETE' });
    loadAll();
  }

  function parseChecklist(json?: string | null): string[] {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (isLoading) {
    return <Card>Loading templates...</Card>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Task templates
          </h3>
          {templates.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No templates"
                description="Create reusable task blueprints with checklists."
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {templates.map((template) => {
                const checklist = parseChecklist(template.checklistJson);
                return (
                  <li
                    key={template.id}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {template.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="capitalize">
                          {template.defaultPriority}
                        </Badge>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-[var(--muted)] hover:text-[var(--danger,#b91c1c)]"
                            aria-label="Delete template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {checklist.length > 0 ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {checklist.length} checklist item(s)
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {canManage ? (
          <Card>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              New template
            </h4>
            <form className="mt-3 space-y-3" onSubmit={handleCreateTemplate}>
              <Input
                label="Name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="e.g. Standard retouch"
              />
              <Select
                label="Default priority"
                value={templatePriority}
                onChange={(event) => setTemplatePriority(event.target.value)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
              <Input
                label="Estimated hours"
                type="number"
                min="0"
                step="0.25"
                value={templateHours}
                onChange={(event) => setTemplateHours(event.target.value)}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Checklist (one per line)
                </span>
                <textarea
                  value={templateChecklist}
                  onChange={(event) => setTemplateChecklist(event.target.value)}
                  rows={4}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                  placeholder={'Cull & select\nColor correct\nExport'}
                />
              </label>
              <Button type="submit" disabled={!templateName.trim()}>
                <Plus className="h-4 w-4" />
                Create template
              </Button>
            </form>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Recurring rules
          </h3>
          {rules.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No recurring rules"
                description="Automate repeating tasks on a schedule."
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {rule.title}
                    </span>
                    <Badge
                      variant={rule.isActive ? 'success' : 'neutral'}
                      className="capitalize"
                    >
                      {rule.cadence}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {rule.project?.name ?? 'No project'} · next{' '}
                    {new Date(rule.nextRunAt).toLocaleDateString()}
                  </p>
                  {canManage ? (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleRule(rule)}
                      >
                        {rule.isActive ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canManage ? (
          <Card>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              New recurring rule
            </h4>
            <form className="mt-3 space-y-3" onSubmit={handleCreateRule}>
              <Input
                label="Title"
                value={ruleTitle}
                onChange={(event) => setRuleTitle(event.target.value)}
                placeholder="e.g. Weekly backup review"
              />
              <Select
                label="Project"
                value={ruleProjectId}
                onChange={(event) => setRuleProjectId(event.target.value)}
                options={projects.map((project) => ({
                  value: project.id,
                  label: `${project.name} (${project.code})`,
                }))}
              />
              <Select
                label="Cadence"
                value={ruleCadence}
                onChange={(event) => setRuleCadence(event.target.value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
              <Input
                label="First run"
                type="datetime-local"
                value={ruleStartAt}
                onChange={(event) => setRuleStartAt(event.target.value)}
              />
              <Select
                label="Template (optional)"
                value={ruleTemplateId}
                onChange={(event) => setRuleTemplateId(event.target.value)}
                options={[
                  { value: '', label: 'None' },
                  ...templates.map((template) => ({
                    value: template.id,
                    label: template.name,
                  })),
                ]}
              />
              <Button
                type="submit"
                disabled={!ruleTitle.trim() || !ruleProjectId || !ruleStartAt}
              >
                <Plus className="h-4 w-4" />
                Create rule
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
