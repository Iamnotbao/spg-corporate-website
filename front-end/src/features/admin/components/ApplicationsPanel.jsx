import { useState } from 'react';
import { downloadAdminApplicationCv } from '../../../services/adminService.js';
import { useAdminApplications } from '../hooks/useAdminApplications.js';
import { formatAdminDate, getErrorMessage, getItemId } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';
import AdminPagination from './AdminPagination.jsx';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';

function getCandidateName(item) {
  return item.name || item.fullName || 'Ứng viên chưa đặt tên';
}

function getCandidatePosition(item) {
  return item.position || item.jobTitle || item.job?.title || 'Chưa xác định';
}

function hasCv(item) {
  return Boolean(
    item.hasCv ??
    (item.cvPublicId || item.cvUrl || item.cv || item.resumeUrl || item.resume),
  );
}

export default function ApplicationsPanel({ onNotify, onUnauthorized }) {
  const applications = useAdminApplications(onUnauthorized);
  const [downloadingId, setDownloadingId] = useState('');
  const [downloadError, setDownloadError] = useState('');

  async function handleDownload(item) {
    const id = getItemId(item);
    setDownloadingId(id);
    setDownloadError('');
    try {
      await downloadAdminApplicationCv(id);
      onNotify(`Đã tải CV của ${getCandidateName(item)}.`);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setDownloadError(getErrorMessage(requestError, 'Không thể tải CV.'));
    } finally {
      setDownloadingId('');
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel__heading admin-panel__heading--applications">
        <div>
          <h2>Hồ sơ ứng tuyển</h2>
          <p>Theo dõi thông tin ứng viên gửi từ website tuyển dụng.</p>
        </div>
        <span className="admin-count-pill">
          {applications.pagination.total.toLocaleString('vi-VN')} hồ sơ
        </span>
      </div>

      <div className="admin-applications-toolbar">
        <div className="admin-search-field">
          <label className="admin-sr-only" htmlFor="application-search">
            Tìm hồ sơ ứng viên
          </label>
          <AdminIcon name="search" size={19} />
          <input
            id="application-search"
            onChange={(event) => applications.updateSearch(event.target.value)}
            placeholder="Tìm theo tên, email hoặc vị trí…"
            type="search"
            value={applications.search}
          />
          {applications.searchPending && (
            <span className="admin-search-field__pending" title="Đang tìm kiếm">
              <span className="admin-spinner" />
            </span>
          )}
          {applications.search && !applications.searchPending && (
            <button
              aria-label="Xóa nội dung tìm kiếm"
              onClick={() => applications.updateSearch('')}
              type="button"
            >
              <AdminIcon name="close" size={16} />
            </button>
          )}
        </div>
        <button
          className="admin-button admin-button--secondary"
          disabled={applications.loading}
          onClick={applications.refresh}
          type="button"
        >
          <AdminIcon name="refresh" size={17} />
          Làm mới
        </button>
      </div>

      {(applications.error || downloadError) && (
        <AdminAlert onRetry={applications.error ? applications.refresh : undefined}>
          {applications.error || downloadError}
        </AdminAlert>
      )}

      {applications.loading && !applications.items.length ? (
        <AdminSkeletonRows />
      ) : !applications.items.length ? (
        <AdminEmpty
          title={applications.search ? 'Không tìm thấy ứng viên' : 'Chưa có hồ sơ'}
        >
          {applications.search
            ? 'Thử tìm bằng tên, email hoặc vị trí khác.'
            : 'Hồ sơ ứng tuyển mới sẽ xuất hiện tại đây.'}
        </AdminEmpty>
      ) : (
        <>
          <div
            className={`admin-table-wrap${applications.loading ? ' is-refreshing' : ''}`}
          >
            <table className="admin-table admin-applications-table">
              <thead>
                <tr>
                  <th>Ứng viên</th>
                  <th>Liên hệ</th>
                  <th>Vị trí</th>
                  <th>Ngày gửi</th>
                  <th className="admin-table__actions-heading">CV</th>
                </tr>
              </thead>
              <tbody>
                {applications.items.map((item) => {
                  const id = getItemId(item);
                  return (
                    <tr key={id}>
                      <td data-label="Ứng viên">
                        <div className="admin-candidate">
                          <span className="admin-candidate__avatar">
                            {getCandidateName(item).charAt(0).toLocaleUpperCase('vi-VN')}
                          </span>
                          <div>
                            <strong>{getCandidateName(item)}</strong>
                            <small>{item.phone || 'Chưa có số điện thoại'}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Liên hệ">
                        {item.email ? (
                          <a className="admin-email-link" href={`mailto:${item.email}`}>
                            {item.email}
                          </a>
                        ) : (
                          <span className="admin-date">Chưa có email</span>
                        )}
                      </td>
                      <td data-label="Vị trí">
                        <span className="admin-position-text">
                          {getCandidatePosition(item)}
                        </span>
                      </td>
                      <td data-label="Ngày gửi">
                        <span className="admin-date">
                          {formatAdminDate(item.createdAt)}
                        </span>
                      </td>
                      <td data-label="CV">
                        {hasCv(item) ? (
                          <button
                            className="admin-cv-button"
                            disabled={downloadingId === id}
                            onClick={() => handleDownload(item)}
                            type="button"
                          >
                            {downloadingId === id ? (
                              <span className="admin-spinner" />
                            ) : (
                              <AdminIcon name="download" size={17} />
                            )}
                            <span>Tải CV</span>
                          </button>
                        ) : (
                          <span className="admin-no-cv">Chưa có</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            onPageChange={applications.setPage}
            pagination={applications.pagination}
          />
        </>
      )}
    </section>
  );
}
