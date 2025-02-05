import '../styles/style.css';
import '../styles/global.css';

const PageWrapper = ({ children }) => (
    <div className="page-wrapper">
        {children}
    </div>
);

export default PageWrapper;