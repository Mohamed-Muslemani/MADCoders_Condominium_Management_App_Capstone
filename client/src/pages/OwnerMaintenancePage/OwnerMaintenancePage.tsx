import { useEffect, useMemo, useState } from 'react';
import {
  getOwnerDashboard,
  getOwnerMaintenanceRequests,
  submitOwnerMaintenanceRequest,
  uploadOwnerMaintenanceAttachment,
} from '../../api/owner';
import {
  deleteMaintenanceRequest,
  updateMaintenanceRequest,
} from '../../api/maintenanceRequests';
import { OwnerLayout } from '../../components/owner/OwnerLayout';
import {
  OwnerActionButton,
  OwnerCard,
  OwnerEmptyState,
  OwnerStatusPill,
  OwnerViewState,
} from '../../components/owner/OwnerUi';
import type {
  CreateMaintenanceRequestRequest,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceScope,
} from '../../types/maintenance-request';
import type { OwnerDashboardResponse, OwnerNavBadgeMap } from '../../types/owner';
import './OwnerMaintenancePage.css';

type FormState = {
  title: string;
  description: string;
  priority: MaintenancePriority;
  scope: MaintenanceScope;
};

const initialFormState: FormState = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  scope: 'UNIT',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusTone(status: MaintenanceRequest['status']) {
  if (status === 'COMPLETED' || status === 'CLOSED') {
    return 'good' as const;
  }

  if (status === 'IN_PROGRESS') {
    return 'warn' as const;
  }

  return 'bad' as const;
}

function formatStatus(status: MaintenanceRequest['status']) {
  return status.replace('_', ' ');
}

function formatScope(scope: MaintenanceScope) {
  return scope === 'UNIT' ? 'Unit' : 'Building';
}

function formatPriority(priority: MaintenancePriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function OwnerMaintenancePage() {
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  async function loadPage() {
    try {
      setLoading(true);
      setError('');

      const [dashboardData, maintenanceData] = await Promise.all([
        getOwnerDashboard(),
        getOwnerMaintenanceRequests({ take: 20 }),
      ]);

      setDashboard(dashboardData);
      setRequests(maintenanceData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load your maintenance page.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  const activeUnit = dashboard?.activeOwnership?.unit ?? null;
  const user = dashboard?.profile ?? null;

  const openRequestCount = useMemo(
    () =>
      requests.filter(
        (request) => request.status === 'OPEN' || request.status === 'IN_PROGRESS',
      ).length,
    [requests],
  );

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      dues: dashboard?.duesSummary.unpaidCount
        ? `${dashboard.duesSummary.unpaidCount} unpaid`
        : undefined,
      maintenance: `${requests.length} total`,
      documents: 'Owners',
    }),
    [dashboard, requests.length],
  );

  function openModal() {
    setSubmitError('');
    setSelectedFile(null);
    setEditingRequest(null);
    setFormState({
      ...initialFormState,
      scope: activeUnit ? 'UNIT' : 'BUILDING',
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setSubmitError('');
    setSelectedFile(null);
    setEditingRequest(null);
  }

  function openEditModal(request: MaintenanceRequest) {
    if (request.status !== 'OPEN') {
      return;
    }

    setSubmitError('');
    setSelectedFile(null);
    setEditingRequest(request);
    setFormState({
      title: request.title,
      description: request.description,
      priority: request.priority,
      scope: request.scope,
    });
    setIsModalOpen(true);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit() {
    const title = formState.title.trim();
    const description = formState.description.trim();

    if (!title) {
      setSubmitError('Title is required.');
      return;
    }

    if (!description) {
      setSubmitError('Description is required.');
      return;
    }

    if (formState.scope === 'UNIT' && !activeUnit?.unitId) {
      setSubmitError('A unit-scoped request needs an active unit assignment.');
      return;
    }

    const payload: CreateMaintenanceRequestRequest = {
      scope: formState.scope,
      title,
      description,
      priority: formState.priority,
      unitId: formState.scope === 'UNIT' ? activeUnit?.unitId : undefined,
    };

    try {
      setIsSubmitting(true);
      setSubmitError('');

      if (editingRequest) {
        const updatedRequest = await updateMaintenanceRequest(
          editingRequest.requestId,
          {
            title,
            description,
            priority: formState.priority,
          },
        );

        if (selectedFile) {
          await uploadOwnerMaintenanceAttachment(updatedRequest.requestId, selectedFile);
        }
      } else {
        const createdRequest = await submitOwnerMaintenanceRequest(payload);

        if (selectedFile) {
          await uploadOwnerMaintenanceAttachment(createdRequest.requestId, selectedFile);
        }
      }

      await loadPage();
      setIsModalOpen(false);
      setFormState(initialFormState);
      setSelectedFile(null);
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not submit your maintenance request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(request: MaintenanceRequest) {
    if (request.status !== 'OPEN' || isSubmitting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${request.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      await deleteMaintenanceRequest(request.requestId);
      await loadPage();
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not delete your maintenance request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="loading"
            title="Loading maintenance page"
            description="We’re gathering your request history and owner unit details."
          />
        </div>
      </main>
    );
  }

  if (error || !dashboard || !user) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="error"
            title="Unable to load maintenance"
            description={error || 'Your maintenance data could not be loaded.'}
            action={<OwnerActionButton onClick={() => void loadPage()}>Try again</OwnerActionButton>}
          />
        </div>
      </main>
    );
  }

  return (
    <>
      <OwnerLayout
        activeRoute="maintenance"
        title="Maintenance"
        subtitle="Submit a maintenance request to the building manager."
        user={user}
        unitLabel={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unit pending'}
        navBadges={navBadges}
        topbarActions={[
          {
            label: '+ New Request',
            onClick: openModal,
          },
        ]}
        showPageHeader={false}
        contentClassName="p-0"
      >
        <div className="owner-maintenance-page">
          <section className="owner-maintenance-hero">
            <div>
              <h2>Maintenance</h2>
              <p>Submit a maintenance request to the building manager.</p>
            </div>

            <OwnerStatusPill
              label={`${requests.length} submitted`}
              tone={openRequestCount > 0 ? 'warn' : 'good'}
            />
          </section>

          <div className="owner-maintenance-content">
            {submitError && !isModalOpen ? (
              <OwnerViewState
                tone="error"
                title="Action could not be completed"
                description={submitError}
              />
            ) : null}

            <OwnerCard
              title="Submit Request"
              action={
                <OwnerActionButton variant="primary" onClick={openModal}>
                  + New
                </OwnerActionButton>
              }
            >
              <div className="owner-maintenance-note">
                Click <b>New</b> and fill the form. This page only uses the fields
                supported by the current backend: scope, priority, title, and
                description.
              </div>
            </OwnerCard>

            <OwnerCard
              title="My Requests"
              badge={`${requests.length} total`}
            >
              {requests.length === 0 ? (
                <OwnerEmptyState
                  title="No requests yet"
                  description="Your maintenance requests will appear here after you submit your first issue."
                  action={
                    <OwnerActionButton variant="primary" onClick={openModal}>
                      Create request
                    </OwnerActionButton>
                  }
                />
              ) : (
                <>
                  <div className="owner-maintenance-list">
                    {requests.map((request) => (
                      <article
                        key={request.requestId}
                        className={[
                          'owner-maintenance-item',
                          request.status === 'OPEN' ? 'is-open' : '',
                        ].join(' ')}
                        onClick={() => openEditModal(request)}
                      >
                        <div className="owner-maintenance-item-main">
                          <strong>{request.title}</strong>
                          <div className="owner-maintenance-item-copy">
                            {request.description}
                          </div>
                          <div className="owner-maintenance-meta">
                            <span className="owner-maintenance-tag">
                              {formatScope(request.scope)}
                            </span>
                            <span className="owner-maintenance-tag">
                              {formatPriority(request.priority)}
                            </span>
                            <span className="owner-maintenance-tag">
                              Created: {formatDate(request.createdAt)}
                            </span>
                            {request.unit?.unitNumber ? (
                              <span className="owner-maintenance-tag">
                                Unit {request.unit.unitNumber}
                              </span>
                            ) : null}
                          </div>

                          {request.attachments?.length ? (
                            <div className="owner-maintenance-attachments">
                              {request.attachments.map((attachment) => (
                                <span
                                  key={attachment.fileId}
                                  className="owner-maintenance-tag"
                                >
                                  {attachment.originalName}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="owner-maintenance-item-side">
                          <OwnerStatusPill
                            label={formatStatus(request.status)}
                            tone={getStatusTone(request.status)}
                          />

                          {request.status === 'OPEN' ? (
                            <div onClick={(event) => event.stopPropagation()}>
                              <OwnerActionButton
                                className="owner-maintenance-icon-button"
                                onClick={() => void handleDelete(request)}
                              >
                                Delete
                              </OwnerActionButton>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="owner-maintenance-note">
                    Open requests can be clicked to edit them, and uploaded
                    attachments appear directly on each request card.
                  </div>
                </>
              )}
            </OwnerCard>
          </div>
        </div>
      </OwnerLayout>

      {isModalOpen ? (
        <>
          <div className="owner-maintenance-modal-overlay" onClick={closeModal} />
          <section className="owner-maintenance-modal" role="dialog" aria-modal="true" aria-label="New maintenance request">
            <div className="owner-maintenance-modal-head">
              <strong>
                {editingRequest ? 'Edit Maintenance Request' : 'New Maintenance Request'}
              </strong>
              <OwnerActionButton className="owner-maintenance-close" onClick={closeModal}>
                X
              </OwnerActionButton>
            </div>

            <div className="owner-maintenance-modal-body">
              {submitError ? (
                <div className="owner-maintenance-errors">
                  <OwnerViewState
                    tone="error"
                    title="Could not submit request"
                    description={submitError}
                  />
                </div>
              ) : null}

              <div className="owner-maintenance-form-grid">
                <div className="owner-maintenance-field">
                  <label htmlFor="maintenance-title">Title *</label>
                  <input
                    id="maintenance-title"
                    className="owner-maintenance-input"
                    value={formState.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    placeholder="e.g., Kitchen sink leaking"
                  />
                </div>

                <div className="owner-maintenance-field">
                  <label htmlFor="maintenance-scope">Scope</label>
                  <select
                    id="maintenance-scope"
                    className="owner-maintenance-select"
                    value={formState.scope}
                    disabled={Boolean(editingRequest)}
                    onChange={(event) =>
                      updateField('scope', event.target.value as MaintenanceScope)
                    }
                  >
                    <option value="UNIT" disabled={!activeUnit}>
                      Unit
                    </option>
                    <option value="BUILDING">Building</option>
                  </select>
                </div>

                <div className="owner-maintenance-field">
                  <label htmlFor="maintenance-priority">Priority</label>
                  <select
                    id="maintenance-priority"
                    className="owner-maintenance-select"
                    value={formState.priority}
                    onChange={(event) =>
                      updateField(
                        'priority',
                        event.target.value as MaintenancePriority,
                      )
                    }
                  >
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div className="owner-maintenance-field">
                  <label htmlFor="maintenance-unit">Unit</label>
                  <input
                    id="maintenance-unit"
                    className="owner-maintenance-input"
                    value={
                      formState.scope === 'UNIT'
                        ? activeUnit
                          ? `Unit ${activeUnit.unitNumber}`
                          : 'No active unit assigned'
                        : 'Building-wide request'
                    }
                    readOnly
                  />
                </div>
              </div>

              <div className="owner-maintenance-field mt-[10px]">
                <label htmlFor="maintenance-description">Description *</label>
                <textarea
                  id="maintenance-description"
                  className="owner-maintenance-textarea"
                  value={formState.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder="Describe the issue..."
                />
              </div>

              <div className="owner-maintenance-field mt-[10px]">
                <label htmlFor="maintenance-file">Photo or PDF (optional)</label>
                <input
                  id="maintenance-file"
                  className="owner-maintenance-file"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.pdf"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                />
                {selectedFile ? (
                  <div className="owner-maintenance-file-name">
                    Selected: {selectedFile.name}
                  </div>
                ) : null}
              </div>

              <div className="owner-maintenance-help">
                {editingRequest
                  ? 'Open requests can be updated here, and you can attach one additional file during this edit.'
                  : 'Submit the request here and optionally include one photo or PDF attachment.'}
              </div>
            </div>

            <div className="owner-maintenance-modal-foot">
              <OwnerActionButton onClick={closeModal}>Cancel</OwnerActionButton>
              <OwnerActionButton
                variant="primary"
                onClick={() => void handleSubmit()}
              >
                {isSubmitting
                  ? editingRequest
                    ? 'Saving...'
                    : 'Submitting...'
                  : editingRequest
                    ? 'Save Changes'
                    : 'Submit'}
              </OwnerActionButton>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
