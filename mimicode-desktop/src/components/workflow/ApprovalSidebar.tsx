import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Send } from 'lucide-react';
import './ApprovalSidebar.css';

export interface PendingApproval {
  blueprint_id: string;
  node_id: string;
  message: string;
  output?: string;
}

interface ApprovalSidebarProps {
  approval: PendingApproval;
  onClose: () => void;
  onResolve: (decision: 'approve' | 'reject' | 'feedback', comment?: string) => void;
}

export const ApprovalSidebar: React.FC<ApprovalSidebarProps> = ({ approval, onClose, onResolve }) => {
  const [comment, setComment] = useState('');

  return (
    <div className="approval-sidebar-overlay">
      <div className="approval-sidebar">
        <div className="approval-header">
          <h3>Approval Required</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="approval-body">
          <div className="approval-message">
            {approval.message}
          </div>
          
          {approval.output && (
            <div className="approval-output-section">
              <div className="approval-output-label">Upstream Output</div>
              <pre className="approval-output-content">{approval.output}</pre>
            </div>
          )}
          
          <div className="approval-actions">
            <button className="btn btn-success" onClick={() => onResolve('approve')}>
              <CheckCircle size={16} /> Approve
            </button>
            <button className="btn btn-danger" onClick={() => onResolve('reject')}>
              <XCircle size={16} /> Reject
            </button>
          </div>
          
          <div className="approval-feedback-section">
            <div className="approval-output-label">Feedback (Ask Agent to retry)</div>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Try again using Rust instead of Python..."
              rows={4}
            />
            <button 
              className="btn btn-secondary" 
              disabled={!comment.trim()}
              onClick={() => onResolve('feedback', comment)}
            >
              <Send size={16} /> Send Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
