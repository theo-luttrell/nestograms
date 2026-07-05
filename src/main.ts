import './styles/global.css';
import './components/nesto-app';
import { ensureAnonymousAuth } from './services/firebase';

// Ensure anonymous auth initializes quietly in the background
ensureAnonymousAuth().then((user) => {
  if (user) {
    console.log('Nestograms initialized with user ID:', user.uid);
  } else {
    console.log('Nestograms running in local storage fallback mode.');
  }
});
