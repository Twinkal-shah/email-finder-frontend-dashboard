import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE || 'http://173.249.7.231:8500'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data
    let message = err.message || 'Request failed'
    if (typeof data === 'string') message = data
    else if (data?.message) message = data.message
    else if (data?.error) message = data.error
    else if (data) message = JSON.stringify(data)
    return Promise.reject(new Error(message))
  }
)

export function findEmail({ domain, name, names, role, company, all }) {
  const body = {}
  if (domain) body.domain = domain
  if (company) body.company = company
  if (Array.isArray(names) && names.length) body.names = names
  else if (name) body.names = [name]
  if (role) body.role = role
  if (all) body.all = true
  return api.post('/find', body)
}

export function verifyEmail(data) {
  return api.post('/verify', data)
} 