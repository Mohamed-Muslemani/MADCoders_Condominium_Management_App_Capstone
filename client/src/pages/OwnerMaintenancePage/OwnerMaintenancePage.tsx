import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  getSelectedOwnerUnitId,
  getOwnerDashboard,
  setSelectedOwnerUnitId,
  submitOwnerMaintenanceRequest,
  uploadOwnerMaintenanceAttachment,
} from '../../api/owner';
import {
  downloadMaintenanceRequestAttachment,
  deleteMaintenanceRequest,
  getMaintenanceRequests,
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

type RequestViewFilter = 'MINE' | 'UNIT' | 'ALL_UNITS' | 'BUILDING' | 'ALL';

const requestFilterCopy: Record<
  RequestViewFilter,
  {
    emptyStateDescription: string;
    helpText: string;
  }
> = {
  MINE: {
    emptyStateDescription:
      'Your maintenance requests will appear here after you submit your first issue.',
    helpText:
      'Showing only the requests you submitted. Only your own open requests can be edited or deleted.',
  },
  UNIT: {
    emptyStateDescription:
      'Requests tied to your selected unit will appear here when they are available.',
    helpText:
      'Showing requests linked to your selected unit, including requests from other co-owners when applicable.',
  },
  ALL_UNITS: {
    emptyStateDescription:
      'Requests across all of your owned units will appear here when they are available.',
    helpText:
      'Showing requests across all of your owned units, including activity from co-owners on those same units.',
  },
  BUILDING: {
    emptyStateDescription:
      'Building-wide requests will appear here when they are available.',
    helpText:
      'Showing building-wide requests that affect common areas or shared operations.',
  },
  ALL: {
    emptyStateDescription:
      'Visible maintenance activity will appear here when requests are available.',
    helpText:
      'Showing your requests alongside building-wide and selected-unit activity. Only your own open requests can be edited or deleted.',
  },
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

  if (status === 'IN_PROGRESS' || status === 'OPEN') {
    return 'warn' as const;
  }

  return 'neutral' as const;
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
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitIdState] = useState(() => getSelectedOwnerUnitId());
  const [requestViewFilter, setRequestViewFilter] = useState<RequestViewFilter>('MINE');

  async function loadPage(unitId = selectedUnitId) {
    try {
      setLoading(true);
      setError('');

      const [dashboardData, maintenanceData] = await Promise.all([
        getOwnerDashboard(unitId || undefined),
        getMaintenanceRequests({ take: 100 }),
      ]);

      setDashboard(dashboardData);
      const resolvedUnitId = dashboardData.activeOwnership?.unit.unitId ?? '';
      setSelectedOwnerUnitId(resolvedUnitId);
      setSelectedUnitIdState(resolvedUnitId);
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
  const ownerships = dashboard?.activeOwnerships ?? [];
  const user = dashboard?.profile ?? null;
  const ownedUnitIds = useMemo(
    () => ownerships.map((ownership) => ownership.unit.unitId),
    [ownerships],
  );
  const hasMultipleUnits = ownedUnitIds.length > 1;
  const visibleRequests = useMemo(
    () =>
      requests.filter((request) => {
        if (request.scope === 'BUILDING') {
          return true;
        }

        if (request.submittedByUserId === user?.userId) {
          return true;
        }

        return Boolean(selectedUnitId) && request.unitId === selectedUnitId;
      }),
    [requests, selectedUnitId, user?.userId],
  );

  const filteredRequests = useMemo(
    () =>
      visibleRequests.filter((request) => {
        if (requestViewFilter === 'MINE') {
          return request.submittedByUserId === user?.userId;
        }

        if (requestViewFilter === 'UNIT') {
          return Boolean(selectedUnitId) && request.unitId === selectedUnitId;
        }

        if (requestViewFilter === 'ALL_UNITS') {
          return request.unitId ? ownedUnitIds.includes(request.unitId) : false;
        }

        if (requestViewFilter === 'BUILDING') {
          return request.scope === 'BUILDING';
        }

        return true;
      }),
    [ownedUnitIds, requestViewFilter, selectedUnitId, user?.userId, visibleRequests],
  );

  const submittedRequestCount = useMemo(
    () =>
      requests.filter((request) => request.submittedByUserId === user?.userId).length,
    [requests, user?.userId],
  );

  const unitRequestCount = useMemo(
    () =>
      requests.filter(
        (request) => Boolean(selectedUnitId) && request.unitId === selectedUnitId,
      ).length,
    [requests, selectedUnitId],
  );

  const buildingRequestCount = useMemo(
    () => requests.filter((request) => request.scope === 'BUILDING').length,
    [requests],
  );

  const allUnitsRequestCount = useMemo(
    () =>
      requests.filter(
        (request) => (request.unitId ? ownedUnitIds.includes(request.unitId) : false),
      ).length,
    [ownedUnitIds, requests],
  );

  const requestCountByFilter = useMemo(
    () => ({
      MINE: submittedRequestCount,
      UNIT: unitRequestCount,
      ALL_UNITS: allUnitsRequestCount,
      BUILDING: buildingRequestCount,
      ALL: visibleRequests.length,
    }),
    [
      allUnitsRequestCount,
      buildingRequestCount,
      submittedRequestCount,
      unitRequestCount,
      visibleRequests.length,
    ],
  );

  const filterBadgeLabel = useMemo(() => {
    const count = requestCountByFilter[requestViewFilter];

    if (requestViewFilter === 'MINE') return `${count} mine`;
    if (requestViewFilter === 'UNIT') return `${count} unit`;
    if (requestViewFilter === 'ALL_UNITS') return `${count} units`;
    if (requestViewFilter === 'BUILDING') return `${count} building`;
    return `${count} visible`;
  }, [requestCountByFilter, requestViewFilter]);

  const activeFilterCopy = requestFilterCopy[requestViewFilter];

  useEffect(() => {
    if (!hasMultipleUnits && requestViewFilter === 'ALL_UNITS') {
      setRequestViewFilter('UNIT');
    }
  }, [hasMultipleUnits, requestViewFilter]);

  const openRequestCount = useMemo(
    () =>
      filteredRequests.filter(
        (request) => request.status === 'OPEN' || request.status === 'IN_PROGRESS',
      ).length,
    [filteredRequests],
  );

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      dues: dashboard?.duesSummary.unpaidCount
        ? `${dashboard.duesSummary.unpaidCount} unpaid`
        : 'Up to date',
      transactions: 'View all',
      maintenance: `${filteredRequests.length} total`,
      documents: `${dashboard?.documentsSummary.availableCount ?? 0} docs`,
      profile: 'Account',
    }),
    [dashboard, filteredRequests.length],
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
    if (request.status !== 'OPEN' || request.submittedByUserId !== user?.userId) {
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

  async function handleAttachmentAction(
    event: MouseEvent<HTMLButtonElement>,
    attachment: NonNullable<MaintenanceRequest['attachments']>[number],
  ) {
    event.stopPropagation();

    try {
      setActiveAttachmentId(attachment.fileId);
      setSubmitError('');

      const { blob, filename, mimeType } =
        await downloadMaintenanceRequestAttachment(attachment.fileId);
      const objectUrl = URL.createObjectURL(blob);

      if (
        mimeType.includes('pdf') ||
        mimeType.startsWith('image/')
      ) {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not open this attachment.',
      );
    } finally {
      setActiveAttachmentId(null);
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
              {ownerships.length > 1 ? (
                <div className="owner-maintenance-unit-switcher">
                  <label htmlFor="owner-maintenance-unit">Viewing unit</label>
                  <select
                    id="owner-maintenance-unit"
                    className="owner-maintenance-select"
                    value={selectedUnitId}
                    onChange={(event) => {
                      const nextUnitId = event.target.value;
                      setSelectedOwnerUnitId(nextUnitId);
                      setSelectedUnitIdState(nextUnitId);
                      void loadPage(nextUnitId);
                    }}
                  >
                    {ownerships.map((ownership) => (
                      <option key={ownership.unit.unitId} value={ownership.unit.unitId}>
                        Unit {ownership.unit.unitNumber}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <OwnerStatusPill
              label={`${filteredRequests.length} shown`}
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
                Click <b>New</b> and fill out the request details to submit an
                issue for your unit or the building.
              </div>
            </OwnerCard>

            <OwnerCard
              title="Requests"
              badge={filterBadgeLabel}
            >
              <div className="owner-maintenance-filters">
                <select
                  id="owner-maintenance-filter"
                  className="owner-maintenance-select"
                  value={requestViewFilter}
                  onChange={(event) =>
                    setRequestViewFilter(event.target.value as RequestViewFilter)
                  }
                >
                  <option value="MINE">My requests</option>
                  <option value="UNIT">{hasMultipleUnits ? 'Selected unit' : 'My unit'}</option>
                  {hasMultipleUnits ? (
                    <option value="ALL_UNITS">All my units</option>
                  ) : null}
                  <option value="BUILDING">Building</option>
                  <option value="ALL">All visible</option>
                </select>
              </div>

              {filteredRequests.length === 0 ? (
                <OwnerEmptyState
                  title="No requests yet"
                  description={activeFilterCopy.emptyStateDescription}
                  action={
                    <OwnerActionButton variant="primary" onClick={openModal}>
                      Create request
                    </OwnerActionButton>
                  }
                />
              ) : (
                <>
                  <div className="owner-maintenance-list">
                    {filteredRequests.map((request) => (
                      <article
                        key={request.requestId}
                        className={[
                          'owner-maintenance-item',
                          request.status === 'OPEN' && request.submittedByUserId === user?.userId ? 'is-open' : '',
                        ].join(' ')}
                        onClick={
                          request.status === 'OPEN' && request.submittedByUserId === user?.userId
                            ? () => openEditModal(request)
                            : undefined
                        }
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
                              {request.scope === 'BUILDING'
                                ? 'Building request'
                                : request.submittedByUserId === user?.userId
                                  ? 'My request'
                                  : `Unit ${request.unit?.unitNumber ?? 'request'}`}
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
                                <button
                                  type="button"
                                  key={attachment.fileId}
                                  className="owner-maintenance-attachment-button"
                                  onClick={(event) =>
                                    void handleAttachmentAction(event, attachment)
                                  }
                                >
                                  {activeAttachmentId === attachment.fileId
                                    ? 'Opening...'
                                    : attachment.originalName}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="owner-maintenance-item-side">
                          <OwnerStatusPill
                            label={formatStatus(request.status)}
                            tone={getStatusTone(request.status)}
                          />

                          {request.status === 'OPEN' && request.submittedByUserId === user?.userId ? (
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
                    {activeFilterCopy.helpText}
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
