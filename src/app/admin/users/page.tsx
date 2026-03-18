'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { roleLabels, roleColors, isSuperAdmin } from '@/lib/permissions'
import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  disableUserTOTP,
} from '@/actions/users'
import { Role } from '@prisma/client'
import { useSession } from 'next-auth/react'

interface UserData {
  id: string
  email: string
  name: string
  role: Role
  totpEnabled: boolean
  createdAt: Date
  _count: { orders: number }
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const { addToast } = useToast()
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(Role.EMPLOYEE)

  const currentUserRole = session?.user?.role as Role | undefined
  const isCurrentUserSuperAdmin = currentUserRole ? isSuperAdmin(currentUserRole) : false

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const result = await getUsers()
      if (result.success) {
        setUsers(result.data as UserData[])
      } else {
        addToast(result.error || 'Fehler beim Laden', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole(Role.EMPLOYEE)
    setShowCreateDialog(true)
  }

  const openEditDialog = (user: UserData) => {
    setEditingUser(user)
    setName(user.name)
    setEmail(user.email)
    setRole(user.role)
    setShowEditDialog(true)
  }

  const openPasswordDialog = (user: UserData) => {
    setEditingUser(user)
    setPassword('')
    setShowPasswordDialog(true)
  }

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password) {
      addToast('Alle Felder sind erforderlich', 'warning')
      return
    }

    if (password.length < 8) {
      addToast('Passwort muss mindestens 8 Zeichen haben', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const result = await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      })

      if (result.success) {
        addToast('Benutzer erstellt', 'success')
        setShowCreateDialog(false)
        loadUsers()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingUser) return

    if (!name.trim() || !email.trim()) {
      addToast('Name und E-Mail sind erforderlich', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const result = await updateUser(editingUser.id, {
        name: name.trim(),
        email: email.trim(),
        role,
      })

      if (result.success) {
        addToast('Benutzer aktualisiert', 'success')
        setShowEditDialog(false)
        loadUsers()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser) return

    if (!password || password.length < 8) {
      addToast('Passwort muss mindestens 8 Zeichen haben', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const result = await resetUserPassword(editingUser.id, password)

      if (result.success) {
        addToast('Passwort zurückgesetzt', 'success')
        setShowPasswordDialog(false)
        setPassword('')
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (user: UserData) => {
    if (user.id === session?.user?.id) {
      addToast('Sie können sich nicht selbst löschen', 'warning')
      return
    }

    if (!confirm(`Möchten Sie "${user.name}" wirklich löschen?`)) {
      return
    }

    try {
      const result = await deleteUser(user.id)

      if (result.success) {
        addToast('Benutzer gelöscht', 'success')
        loadUsers()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  const handleDisableTOTP = async (user: UserData) => {
    if (!confirm(`TOTP für "${user.name}" wirklich deaktivieren?`)) {
      return
    }

    try {
      const result = await disableUserTOTP(user.id)

      if (result.success) {
        addToast('TOTP deaktiviert', 'success')
        loadUsers()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  const roleOptions = [
    { value: Role.EMPLOYEE, label: roleLabels.EMPLOYEE },
    { value: Role.ADMIN, label: roleLabels.ADMIN },
    { value: Role.HEAD_ADMIN, label: roleLabels.HEAD_ADMIN },
    ...(isCurrentUserSuperAdmin
      ? [{ value: Role.SUPER_ADMIN, label: roleLabels.SUPER_ADMIN }]
      : []),
  ]

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
        <Button onClick={openCreateDialog}>+ Neuer Benutzer</Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Benutzer suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-4xl mb-4 block">👥</span>
            <p className="text-gray-500">Keine Benutzer gefunden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const isCurrentUser = user.id === session?.user?.id
            const canEdit =
              isCurrentUserSuperAdmin ||
              (user.role !== Role.SUPER_ADMIN && !isCurrentUser)
            const canDelete =
              !isCurrentUser &&
              (isCurrentUserSuperAdmin || user.role !== Role.SUPER_ADMIN)

            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium">{user.name}</span>
                        <Badge className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                        {user.totpEnabled && (
                          <Badge variant="success" className="text-xs">
                            🔐 2FA
                          </Badge>
                        )}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            Sie
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Erstellt: {formatDate(user.createdAt)} • {user._count.orders} Bestellung(en)
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {canEdit && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordDialog(user)}
                          >
                            Passwort
                          </Button>
                        </>
                      )}
                      {user.totpEnabled && canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisableTOTP(user)}
                          title="2FA deaktivieren"
                        >
                          🔓
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-700"
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogHeader>
          <DialogTitle>Neuer Benutzer</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Mustermann"
            disabled={isSaving}
          />

          <Input
            label="E-Mail *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="max@firma.de"
            disabled={isSaving}
          />

          <Input
            label="Passwort *"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 8 Zeichen"
            disabled={isSaving}
          />

          <Select
            label="Rolle *"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={roleOptions}
            disabled={isSaving}
          />
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowCreateDialog(false)}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button onClick={handleCreate} isLoading={isSaving}>
            Erstellen
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)}>
        <DialogHeader>
          <DialogTitle>Benutzer bearbeiten</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
          />

          <Input
            label="E-Mail *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSaving}
          />

          <Select
            label="Rolle *"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={roleOptions}
            disabled={isSaving}
          />
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowEditDialog(false)}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button onClick={handleUpdate} isLoading={isSaving}>
            Speichern
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)}>
        <DialogHeader>
          <DialogTitle>Passwort zurücksetzen</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Neues Passwort für <strong>{editingUser?.name}</strong> setzen:
          </p>

          <Input
            label="Neues Passwort *"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 8 Zeichen"
            disabled={isSaving}
          />
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowPasswordDialog(false)}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button onClick={handleResetPassword} isLoading={isSaving}>
            Passwort setzen
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

