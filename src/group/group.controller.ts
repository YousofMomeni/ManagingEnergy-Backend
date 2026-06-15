// src/group/group.controller.ts
import { Controller, Post, Delete, Body, Param, Get, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { CreateGroupDto, AddStationsDto } from './dto/create-group.dto';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiBody({ type: CreateGroupDto })
  @ApiResponse({ status: 201, description: 'Group successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createGroup(@Body() body: CreateGroupDto) {
    return this.groupService.createGroup(body.name, body.stationIds);
  }

  @Get()  // Protected - requires token
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({ status: 200, description: 'Return all groups' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.groupService.findAll();
  }

  @Post(':id/stations')
  @ApiOperation({ summary: 'Add stations to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: AddStationsDto })
  @ApiResponse({ status: 200, description: 'Stations added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addStations(@Param('id', ParseIntPipe) id: number, @Body() body: AddStationsDto) {
    return this.groupService.addStations(id, body.stationIds);
  }

  @Delete(':id/stations')
  @ApiOperation({ summary: 'Remove stations from a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: AddStationsDto })
  @ApiResponse({ status: 200, description: 'Stations removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeStations(@Param('id', ParseIntPipe) id: number, @Body() body: AddStationsDto) {
    return this.groupService.removeStations(id, body.stationIds);
  }

  @Post(':id/subgroups')
  @ApiOperation({ summary: 'Add a subgroup' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ schema: { properties: { subGroupId: { type: 'number', example: 2 } } } })
  @ApiResponse({ status: 200, description: 'Subgroup added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addSubGroup(@Param('id', ParseIntPipe) id: number, @Body('subGroupId') subGroupId: number) {
    return this.groupService.addSubGroup(id, subGroupId);
  }

  @Delete(':id/subgroups/:subGroupId')
  @ApiOperation({ summary: 'Remove a subgroup' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiParam({ name: 'subGroupId', description: 'Subgroup ID' })
  @ApiResponse({ status: 200, description: 'Subgroup removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeSubGroup(
    @Param('id', ParseIntPipe) id: number,
    @Param('subGroupId', ParseIntPipe) subGroupId: number
  ) {
    return this.groupService.removeSubGroup(id, subGroupId);
  }
}