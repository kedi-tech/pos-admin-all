import Icon from './Icon';

export default function Modal({ title, children, onClose, footer, size = 'md' }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal${size === 'lg' ? ' lg' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
