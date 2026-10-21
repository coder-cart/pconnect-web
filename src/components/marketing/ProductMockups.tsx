type MockVariant =
  | 'workspace'
  | 'chat'
  | 'tasks'
  | 'files'
  | 'approvals'
  | 'permissions'
  | 'portal';

const LABELS: Record<MockVariant, string> = {
  workspace: 'Colabdeck workspace preview',
  chat: 'Team chat preview',
  tasks: 'Projects and tasks preview',
  files: 'File sharing preview',
  approvals: 'Approval workflow preview',
  permissions: 'Permissions preview',
  portal: 'Client portal preview',
};

export function ProductMockup({
  variant = 'workspace',
  className = '',
}: {
  variant?: MockVariant;
  className?: string;
}) {
  return (
    <div
      className={`mk-mock ${className}`}
      role="img"
      aria-label={LABELS[variant]}
    >
      <div className="mk-mock__chrome" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {variant === 'workspace' ? <WorkspaceBody /> : null}
      {variant === 'chat' ? <ChatBody /> : null}
      {variant === 'tasks' ? <TasksBody /> : null}
      {variant === 'files' ? <FilesBody /> : null}
      {variant === 'approvals' ? <ApprovalsBody /> : null}
      {variant === 'permissions' ? <PermissionsBody /> : null}
      {variant === 'portal' ? <PortalBody /> : null}
    </div>
  );
}

function WorkspaceBody() {
  return (
    <div className="mk-mock__dashboard" aria-hidden="true">
      <aside className="mk-mock__side">
        <div className="mk-mock__brand-line" />
        <p className="mk-mock__side-label">Workspace</p>
        <div className="mk-mock__pill mk-mock__pill--active">Dashboard</div>
        <div className="mk-mock__pill">Chat</div>
        <div className="mk-mock__pill">Orders</div>
        <div className="mk-mock__pill">Files</div>
      </aside>
      <section className="mk-mock__main mk-mock__main--dash">
        <div className="mk-mock__dash-head">
          <div className="mk-mock__bar mk-mock__bar--wide" />
          <div className="mk-mock__bar mk-mock__bar--short" />
        </div>
        <div className="mk-mock__stats">
          <div className="mk-mock__stat">
            <span>12</span>
            <em>Total projects</em>
          </div>
          <div className="mk-mock__stat">
            <span>4</span>
            <em>Planning</em>
          </div>
          <div className="mk-mock__stat">
            <span>5</span>
            <em>In progress</em>
          </div>
          <div className="mk-mock__stat">
            <span>3</span>
            <em>Ready</em>
          </div>
        </div>
        <div className="mk-mock__table">
          <div className="mk-mock__table-row mk-mock__table-row--head">
            <span />
            <span />
            <span />
          </div>
          <div className="mk-mock__table-row">
            <span />
            <span />
            <span className="mk-mock__chip">In progress</span>
          </div>
          <div className="mk-mock__table-row">
            <span />
            <span />
            <span className="mk-mock__chip mk-mock__chip--soft">Ready</span>
          </div>
          <div className="mk-mock__table-row">
            <span />
            <span />
            <span className="mk-mock__chip">Planning</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatBody() {
  return (
    <div className="mk-mock__stack" aria-hidden="true">
      <div className="mk-mock__bar mk-mock__bar--accent" />
      <div className="mk-mock__msg">
        <div className="mk-mock__avatar" />
        <div className="mk-mock__bar mk-mock__bar--mid" />
      </div>
      <div className="mk-mock__msg">
        <div className="mk-mock__avatar" />
        <div className="mk-mock__bar" />
      </div>
      <div className="mk-mock__thread">
        <div className="mk-mock__bar mk-mock__bar--short" />
        <div className="mk-mock__bar mk-mock__bar--mid" />
      </div>
    </div>
  );
}

function TasksBody() {
  return (
    <div className="mk-mock__stack" aria-hidden="true">
      <div className="mk-mock__bar mk-mock__bar--accent" />
      {['Ready', 'In progress', 'Review'].map((label) => (
        <div key={label} className="mk-mock__task">
          <span>{label}</span>
          <div className="mk-mock__bar mk-mock__bar--mid" />
        </div>
      ))}
    </div>
  );
}

function FilesBody() {
  return (
    <div className="mk-mock__stack" aria-hidden="true">
      <div className="mk-mock__bar mk-mock__bar--accent" />
      <div className="mk-mock__file-row">
        <div className="mk-mock__file" />
        <span className="mk-mock__chip">Shared</span>
      </div>
      <div className="mk-mock__file-row">
        <div className="mk-mock__file" />
        <span className="mk-mock__chip">Internal</span>
      </div>
      <div className="mk-mock__file-row">
        <div className="mk-mock__file mk-mock__file--short" />
        <span className="mk-mock__chip mk-mock__chip--soft">Link</span>
      </div>
    </div>
  );
}

function ApprovalsBody() {
  return (
    <div className="mk-mock__stack" aria-hidden="true">
      <div className="mk-mock__bar mk-mock__bar--accent" />
      <div className="mk-mock__bar" />
      <div className="mk-mock__actions">
        <span className="mk-mock__btn-ghost">Request changes</span>
        <span className="mk-mock__btn">Approve</span>
      </div>
    </div>
  );
}

function PermissionsBody() {
  return (
    <div className="mk-mock__stack" aria-hidden="true">
      {['Admin', 'Manager', 'Team member', 'Client'].map((role, index) => (
        <div key={role} className="mk-mock__role">
          <span>{role}</span>
          <span className={index < 3 ? 'mk-mock__dot' : 'mk-mock__dot mk-mock__dot--off'} />
        </div>
      ))}
    </div>
  );
}

function PortalBody() {
  return (
    <div className="mk-mock__stack" aria-hidden="true">
      <div className="mk-mock__bar mk-mock__bar--accent" />
      <div className="mk-mock__chips">
        <span className="mk-mock__chip mk-mock__chip--soft">Client portal view</span>
      </div>
      <div className="mk-mock__bar" />
      <div className="mk-mock__bar mk-mock__bar--mid" />
      <div className="mk-mock__bar mk-mock__bar--short" />
    </div>
  );
}
