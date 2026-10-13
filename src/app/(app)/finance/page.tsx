'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, RestrictedState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
import { CreateInvoiceModal } from '@/components/modals/CreateInvoiceModal';
import { CreateExpenseModal } from '@/components/modals/CreateExpenseModal';
import { PayInvoiceModal } from '@/components/finance/PayInvoiceModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface FinanceSummary {
  totalRevenue: number;
  outstanding: number;
  pendingCount: number;
  invoiceCount: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  totalAmount: string | number;
  status: string;
  clientOrganization?: { name: string };
}

interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  amount: string | number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  incurredOn: string;
  submitter?: { fullName: string };
  project?: { name: string; code: string };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusVariant(status: string) {
  if (status === 'paid') return 'success' as const;
  if (status === 'sent' || status === 'overdue') return 'warning' as const;
  return 'neutral' as const;
}

function isPermissionError(message: string) {
  return /permission|forbidden|not allowed|restricted/i.test(message);
}

export default function FinancePage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const isExternal = userIsExternal(user);
  const canViewFinance =
    userHasPermission(user, 'finance.invoices.view_all') ||
    userHasPermission(user, 'finance.invoices.create') ||
    isExternal;
  const canCreateInvoice = userHasPermission(user, 'finance.invoices.create');
  const canManageExpenses =
    userHasPermission(user, 'finance.invoices.view_all') ||
    userHasPermission(user, 'payments.manage');
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<InvoiceRecord | null>(null);

  function loadFinance() {
    setIsLoading(true);
    setErrorMessage(null);
    setAccessRestricted(false);

    const requests: Promise<unknown>[] = [
      apiRequest<ApiResponse<InvoiceRecord[]>>('/invoices').then(
        (invoicesResponse) => setInvoices(invoicesResponse.data),
      ),
    ];

    if (userHasPermission(user, 'finance.invoices.view_all')) {
      requests.push(
        apiRequest<ApiResponse<FinanceSummary>>('/invoices/summary/overview')
          .then((summaryResponse) => setSummary(summaryResponse.data))
          .catch(() => setSummary(null)),
      );
    } else {
      setSummary(null);
    }

    if (canManageExpenses) {
      requests.push(
        apiRequest<ApiResponse<ExpenseRecord[]>>('/expenses')
          .then((expensesResponse) => setExpenses(expensesResponse.data))
          .catch(() => setExpenses([])),
      );
    } else {
      setExpenses([]);
    }

    Promise.all(requests)
      .catch((error: Error) => {
        if (isPermissionError(error.message)) {
          setAccessRestricted(true);
        } else {
          setErrorMessage(error.message);
        }
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (canViewFinance) {
      loadFinance();
    } else {
      setIsLoading(false);
    }
  }, [refreshKey, canViewFinance]);

  if (!canViewFinance || accessRestricted) {
    return (
      <RestrictedState
        title="Finance access restricted"
        description="You need finance permissions to view invoices and expenses."
      />
    );
  }

  function exportInvoices() {
    const rows = [
      ['Invoice #', 'Client', 'Amount', 'Status'],
      ...invoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.clientOrganization?.name ?? '',
        String(invoice.totalAmount),
        invoice.status,
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'invoices.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'paid');

  async function updateExpenseStatus(
    expenseId: string,
    approvalStatus: 'approved' | 'rejected',
  ) {
    try {
      await apiRequest(`/expenses/${expenseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ approvalStatus }),
      });
      notifyRefresh();
      loadFinance();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update expense',
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Invoices and revenue overview for your workspace."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Finance' },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportInvoices} disabled={!invoices.length}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            {canCreateInvoice ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'invoices', label: 'Invoices' },
          ...(canManageExpenses
            ? [{ id: 'expenses', label: 'Expenses' }]
            : []),
          { id: 'reports', label: 'Reports' },
        ]}
      />

      {errorMessage ? (
        <ErrorState title="Unable to load finance data" description={errorMessage} />
      ) : null}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : activeTab === 'overview' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              trend={`${summary?.invoiceCount ?? 0} invoices`}
              trendDirection="up"
              icon={FileText}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(summary?.outstanding ?? 0)}
              trend={`${summary?.pendingCount ?? 0} pending`}
              trendDirection="down"
              icon={FileText}
            />
            <StatCard
              label="Paid Invoices"
              value={String(paidInvoices.length)}
              trend="Live"
              trendDirection="up"
              icon={FileText}
            />
            <StatCard
              label="Open Invoices"
              value={String(openInvoices.length)}
              trend="Live"
              trendDirection="up"
              icon={FileText}
            />
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Recent Invoices
              </h2>
            </div>
            <InvoiceTable invoices={invoices.slice(0, 5)} onPay={setPayInvoice} />
          </Card>
        </>
      ) : activeTab === 'invoices' ? (
        invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Invoices created for clients will appear here."
          />
        ) : (
          <Card>
            <InvoiceTable invoices={invoices} onPay={setPayInvoice} />
          </Card>
        )
      ) : activeTab === 'expenses' ? (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setExpenseOpen(true)}>
              <Plus className="h-4 w-4" />
              Submit expense
            </Button>
          </div>
          {expenses.length === 0 ? (
            <EmptyState
              title="No expenses yet"
              description="Submitted expenses will appear here for review."
            />
          ) : (
            <Card>
              <ExpenseTable
                expenses={expenses}
                canManageFinance={canManageExpenses}
                onUpdateStatus={updateExpenseStatus}
              />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Revenue Report
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ReportMetric label="Total billed" value={formatCurrency(summary?.totalRevenue ?? 0)} />
            <ReportMetric label="Collected" value={formatCurrency(paidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0))} />
            <ReportMetric label="Outstanding" value={formatCurrency(summary?.outstanding ?? 0)} />
          </div>
        </Card>
      )}

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          notifyRefresh();
          loadFinance();
        }}
      />
      <CreateExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onCreated={() => {
          notifyRefresh();
          loadFinance();
        }}
      />
      <PayInvoiceModal
        invoiceId={payInvoice?.id ?? null}
        invoiceNumber={payInvoice?.invoiceNumber}
        onClose={() => setPayInvoice(null)}
        onPaid={() => {
          setPayInvoice(null);
          notifyRefresh();
          loadFinance();
        }}
      />
    </div>
  );
}

function InvoiceTable({
  invoices,
  onPay,
}: {
  invoices: InvoiceRecord[];
  onPay?: (invoice: InvoiceRecord) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">Invoice #</th>
            <th className="px-3 py-2 font-medium">Client</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const payable =
              invoice.status !== 'paid' && invoice.status !== 'cancelled';
            return (
              <tr
                key={invoice.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-3 py-3 font-medium text-[var(--foreground)]">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-3 py-3 text-[var(--muted)]">
                  {invoice.clientOrganization?.name ?? '—'}
                </td>
                <td className="px-3 py-3 text-[var(--foreground)]">
                  {formatCurrency(Number(invoice.totalAmount))}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={statusVariant(invoice.status)}>
                    {invoice.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  {payable && onPay ? (
                    <Button size="sm" onClick={() => onPay(invoice)}>
                      Pay
                    </Button>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function expenseStatusVariant(status: string) {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'warning' as const;
}

function ExpenseTable({
  expenses,
  canManageFinance,
  onUpdateStatus,
}: {
  expenses: ExpenseRecord[];
  canManageFinance: boolean;
  onUpdateStatus: (expenseId: string, status: 'approved' | 'rejected') => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium">Submitter</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr
              key={expense.id}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-3 py-3 font-medium text-[var(--foreground)]">
                {expense.category}
              </td>
              <td className="px-3 py-3 text-[var(--muted)]">{expense.description}</td>
              <td className="px-3 py-3 text-[var(--muted)]">
                {expense.submitter?.fullName ?? '—'}
              </td>
              <td className="px-3 py-3 text-[var(--foreground)]">
                {formatCurrency(Number(expense.amount))}
              </td>
              <td className="px-3 py-3">
                <Badge variant={expenseStatusVariant(expense.approvalStatus)}>
                  {expense.approvalStatus}
                </Badge>
              </td>
              <td className="px-3 py-3">
                {canManageFinance && expense.approvalStatus === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUpdateStatus(expense.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUpdateStatus(expense.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <span className="text-[var(--muted)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
