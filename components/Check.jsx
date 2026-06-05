import Icon from './Icon';
export default function Check({ on, onChange }) {
  return (
    <div className={`check${on ? ' on' : ''}`} onClick={e => { e.stopPropagation(); onChange && onChange(!on); }}>
      <Icon name="check" size={10} />
    </div>
  );
}
