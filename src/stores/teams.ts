import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getBackend } from '@/services'
import type { CreateTeamInput, Team, TeamMember, UpdateTeamInput } from '@/types'

export const useTeamsStore = defineStore('teams', () => {
  const backend = getBackend()
  const teams = ref<Team[]>([])
  const activeTeamMembers = ref<TeamMember[]>([])
  const loading = ref(false)
  const membersLoading = ref(false)
  const error = ref('')

  function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message
    }
    return fallback
  }

  async function bootstrap() {
    loading.value = true
    error.value = ''
    try {
      teams.value = await backend.listTeams()
    } catch (err) {
      error.value = getErrorMessage(err, 'No se pudieron cargar los equipos')
    } finally {
      loading.value = false
    }
  }

  async function createTeam(input: CreateTeamInput): Promise<Team> {
    error.value = ''
    try {
      const team = await backend.createTeam(input)
      teams.value.push(team)
      return team
    } catch (err) {
      error.value = getErrorMessage(err, 'No se pudo crear el equipo')
      throw err
    }
  }

  async function updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
    error.value = ''
    try {
      const updated = await backend.updateTeam(id, input)
      const idx = teams.value.findIndex((t) => t.id === id)
      if (idx >= 0) teams.value[idx] = updated
      return updated
    } catch (err) {
      error.value = getErrorMessage(err, 'No se pudo actualizar el equipo')
      throw err
    }
  }

  async function deleteTeam(id: string) {
    error.value = ''
    try {
      await backend.deleteTeam(id)
      teams.value = teams.value.filter((t) => t.id !== id)
      activeTeamMembers.value = activeTeamMembers.value.filter((m) => m.teamId !== id)
    } catch (err) {
      error.value = getErrorMessage(err, 'No se pudo eliminar el equipo')
      throw err
    }
  }

  async function loadMembers(teamId: string) {
    membersLoading.value = true
    try {
      activeTeamMembers.value = await backend.listTeamMembers(teamId)
    } finally {
      membersLoading.value = false
    }
  }

  async function addMember(teamId: string, userId: string) {
    const member = await backend.addTeamMember(teamId, userId)
    activeTeamMembers.value.push(member)
    const team = teams.value.find((t) => t.id === teamId)
    if (team) team.memberCount = (team.memberCount ?? 0) + 1
    return member
  }

  async function removeMember(teamId: string, userId: string) {
    await backend.removeTeamMember(teamId, userId)
    activeTeamMembers.value = activeTeamMembers.value.filter(
      (m) => !(m.teamId === teamId && m.userId === userId),
    )
    const team = teams.value.find((t) => t.id === teamId)
    if (team && (team.memberCount ?? 0) > 0) team.memberCount = (team.memberCount ?? 1) - 1
  }

  return {
    teams,
    activeTeamMembers,
    loading,
    membersLoading,
    error,
    bootstrap,
    createTeam,
    updateTeam,
    deleteTeam,
    loadMembers,
    addMember,
    removeMember,
  }
})
